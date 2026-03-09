import { createApiClient, convertTuyauError } from './api-client.js'
import type { ApiClient } from './api-client.js'
import { PermissionError } from './errors.js'
import { HydratedEntity } from './hydrated-entity.js'
import type { SerializedFactoid, EntityResponse } from './hydrated-entity.js'
import { Factoid } from './factoid.js'
import type { RootFactoid } from './root-factoid.js'
import { PaginatedCollection } from './paginated-collection.js'
import { StateManager } from './state-manager.js'
import { ChangeTracker } from './change-tracker.js'
import { resolveSchemaType, resolveRootType } from './type-map.js'
import { success, failure, paginatedSuccess, paginatedFailure } from './result.js'
import type { LinxError } from './errors.js'
import type { LinxResult, PaginatedResult, PaginationMeta } from './result.js'
import type {
    LinxClientConfig,
    LinxClientInstance,
    AuthenticatedLinxClientInstance,
    SessionClientInstance,
    StateSnapshot,
    EffectivePermission,
    PermissionAction,
} from './types.js'

function hasPermission(permissions: EffectivePermission[], action: PermissionAction): boolean {
    return permissions.some((p) => p.action === 'admin' || p.action === action)
}

function requirePermission(permissions: EffectivePermission[], action: PermissionAction): void {
    if (!hasPermission(permissions, action)) {
        throw new PermissionError(action)
    }
}

// ── SessionClient ───────────────────────────────────────────────────

/**
 * A permission-scoped session client.
 *
 * Uses a JS Proxy so that every Schema.org type is accessible as a method:
 *   session.gasStation('uuid')  → GET /LocalBusiness/uuid?depth=1
 *   session.hotel.list()        → GET /LocalBusiness?additionalType=Hotel
 *   session.person.create(data) → POST /Person/batch
 *
 * All API calls are made through the Tuyau client, providing full type safety
 * from the API's controller return types and VineJS validators.
 */
class SessionClientImpl {
    private api: ApiClient
    private state: StateManager
    private tracker: ChangeTracker
    private _lastRawResponse: EntityResponse | null = null
    readonly permissions: EffectivePermission[]

    constructor(api: ApiClient, permissions: EffectivePermission[]) {
        this.api = api
        this.tracker = new ChangeTracker()
        this.state = new StateManager(this.tracker)
        this.permissions = permissions

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (typeof prop === 'symbol' || prop in target) {
                    return Reflect.get(target, prop, receiver)
                }
                if (typeof prop === 'string' && prop !== 'then') {
                    return target.createTypeAccessor(prop)
                }
                return undefined
            },
        })
    }

    private createTypeAccessor(camelName: string) {
        const schemaType = resolveSchemaType(camelName)
        const rootType = resolveRootType(schemaType)
        const perms = this.permissions

        const accessor = async (
            id: string,
            options?: { depth?: number },
        ): Promise<LinxResult<HydratedEntity>> => {
            try {
                requirePermission(perms, 'read')

                const cached = this.state.getEntity(id)
                if (cached && !options?.depth) return success(cached)

                const depth = options?.depth ?? 1
                // Note: query params are cast because Tuyau's registry generator
                // doesn't auto-detect query validators on GET routes. Response
                // type is still fully inferred from the controller return type.
                const response = await this.api.request('entities.show', {
                    params: { type: rootType, id },
                    query: { depth },
                } as any)

                this._lastRawResponse = response as EntityResponse

                const rawRoot = response.entities.find((e) => e.id === id)
                if (!rawRoot) throw new Error(`Entity ${id} not found in response`)

                const entity = new HydratedEntity(rawRoot, response, this.api, this.tracker)
                this.state.setEntity(id, entity)
                this.registerAndLoadSuggestions(entity)
                return success(entity)
            } catch (err) {
                return failure(convertTuyauError(err, 'GET', `/${rootType}/${id}`) as LinxError)
            }
        }

        const fetchPage = async (
            page: number,
            perPage: number,
            filters?: Record<string, string>,
        ): Promise<PaginatedResult<HydratedEntity>> => {
            try {
                requirePermission(perms, 'read')

                const response = await this.api.request('entities.index', {
                    params: { type: rootType },
                    query: {
                        depth: 1,
                        page,
                        perPage,
                        ...(schemaType !== rootType ? { additionalType: schemaType } : {}),
                        ...filters,
                    },
                } as any)

                this._lastRawResponse = response as EntityResponse

                const rootIds = new Set(
                    response.entities
                        .filter((e) => e.type === rootType ||
                            (schemaType !== rootType && e.additionalType === schemaType))
                        .map((e) => e.id)
                )

                const entities = response.entities
                    .filter((e) => rootIds.has(e.id))
                    .map((rawEntity) => {
                        const entity = new HydratedEntity(rawEntity, response, this.api, this.tracker)
                        this.state.setEntity(rawEntity.id, entity)
                        this.registerAndLoadSuggestions(entity)
                        return entity
                    })

                return paginatedSuccess(
                    entities,
                    response.meta as PaginationMeta,
                    (p) => fetchPage(p, perPage, filters),
                )
            } catch (err) {
                return paginatedFailure(convertTuyauError(err, 'GET', `/${rootType}`) as LinxError)
            }
        }

        accessor.get = accessor

        accessor.list = async (options?: {
            page?: number
            perPage?: number
            filters?: Record<string, string>
        }): Promise<PaginatedResult<HydratedEntity>> => {
            const page = options?.page ?? 1
            const perPage = options?.perPage ?? 20
            return fetchPage(page, perPage, options?.filters)
        }

        accessor.create = async (data: Record<string, unknown>): Promise<LinxResult<HydratedEntity>> => {
            try {
                requirePermission(perms, 'create')

                const attributes = Object.entries(data).map(([attribute, value]) => ({
                    attribute,
                    value,
                    source: {},
                }))

                const response = await this.api.request('entities.batchStore', {
                    params: { type: rootType },
                    body: {
                        type: rootType,
                        additionalType: schemaType !== rootType ? schemaType : undefined,
                        attributes,
                    },
                } as any)

                this._lastRawResponse = response as EntityResponse

                const rawRoot = response.entities[0]
                if (!rawRoot) throw new Error('No entity in batch create response')

                const entity = new HydratedEntity(rawRoot, response, this.api, this.tracker)
                this.state.setEntity(rawRoot.id, entity)
                this.registerAndLoadSuggestions(entity)
                return success(entity)
            } catch (err) {
                return failure(convertTuyauError(err, 'POST', `/${rootType}/batch`) as LinxError)
            }
        }

        return accessor
    }

    /**
     * Register all factoids from an entity in the state manager,
     * then fire background requests to load suggestions for each.
     */
    private registerAndLoadSuggestions(entity: HydratedEntity): void {
        const factoids = (entity as any).getAllFactoids() as RootFactoid[]
        for (const factoid of factoids) {
            this.state.setFactoid(factoid.id, factoid)
            this.loadSuggestionsInBackground(factoid)
        }
    }

    /**
     * Fire-and-forget: fetch the first page of suggestions for a factoid
     * and attach them to the RootFactoid's `.suggestions` property.
     */
    private async loadSuggestionsInBackground(factoid: RootFactoid): Promise<void> {
        try {
            const result = await this.api.request('factoids.suggestions', {
                params: { id: factoid.id },
            })
            const rawSuggestions = result.data as unknown as SerializedFactoid[]
            const suggestions = rawSuggestions.map(
                (raw) => new Factoid(raw, this.api),
            )
            const fetchPage = (page: number) => this.fetchSuggestionsPage(factoid.id, page)
            this.state.attachSuggestions(factoid.id, suggestions, result.meta as any, fetchPage)
        } catch {
            // Silently fail — suggestions are non-critical
        }
    }

    /**
     * Fetch a specific page of suggestions for a factoid.
     * Used as the page fetcher for PaginatedCollection.
     */
    private async fetchSuggestionsPage(
        factoidId: string,
        page: number,
    ): Promise<PaginatedCollection<Factoid>> {
        const result = await this.api.request('factoids.suggestions', {
            params: { id: factoidId },
            query: { page },
        } as any)
        const rawSuggestions = result.data as unknown as SerializedFactoid[]
        const suggestions = rawSuggestions.map(
            (raw) => new Factoid(raw, this.api),
        )
        return new PaginatedCollection(
            suggestions,
            result.meta as any,
            (p) => this.fetchSuggestionsPage(factoidId, p),
        )
    }

    /**
     * Returns the raw API response from the most recent entity request.
     * Useful for inspecting the flat { entities, factoids } payload
     * before SDK assembly.
     */
    getLastRawResponse(): EntityResponse | null {
        return this._lastRawResponse
    }

    /**
     * Returns a snapshot of the internal state manager.
     * Shows all cached entities and factoids currently tracked by this session.
     */
    getStateSnapshot(): StateSnapshot {
        return this.state.snapshot()
    }

    /** Clear the internal entity cache */
    clearCache(): void {
        this.state.clear()
    }

    /** Invalidate a specific cached entity */
    invalidate(id: string): void {
        this.state.invalidate(id)
    }

    /**
     * Query claims. Requires review_claims permission for all claims.
     * Returns a paginated result of claim entries.
     */
    async claims(filters?: {
        status?: 'pending' | 'approved' | 'rejected'
        page?: number
        perPage?: number
    }): Promise<PaginatedResult<any>> {
        try {
            const page = filters?.page ?? 1
            const perPage = filters?.perPage ?? 20

            const response = await this.api.request('claims.index', {
                query: { ...filters, page, perPage },
            } as any)

            const data = (response as any).data
            const meta = (response as any).meta as PaginationMeta

            const fetchPage = (p: number) =>
                this.claims({ ...filters, page: p, perPage })

            return paginatedSuccess(data, meta, fetchPage)
        } catch (err) {
            return paginatedFailure(convertTuyauError(err, 'GET', '/claims') as LinxError)
        }
    }

    /**
     * Query reports on a specific factoid.
     * Returns a paginated result of report entries.
     */
    async reports(factoidId: string, filters?: {
        status?: 'open' | 'reviewed' | 'resolved' | 'dismissed'
        page?: number
        perPage?: number
    }): Promise<PaginatedResult<any>> {
        try {
            const page = filters?.page ?? 1
            const perPage = filters?.perPage ?? 20

            const response = await this.api.request('reports.index', {
                params: { id: factoidId },
                query: { ...filters, page, perPage },
            } as any)

            const data = (response as any).data
            const meta = (response as any).meta as PaginationMeta

            const fetchPage = (p: number) =>
                this.reports(factoidId, { ...filters, page: p, perPage })

            return paginatedSuccess(data, meta, fetchPage)
        } catch (err) {
            return paginatedFailure(convertTuyauError(err, 'GET', `/factoids/${factoidId}/reports`) as LinxError)
        }
    }

    /**
     * Query activity logs. Requires read_own_logs or read_all_logs permission.
     * Returns a paginated result of activity log entries.
     */
    async logs(filters?: {
        action?: string
        category?: string
        entityId?: string
        factoidId?: string
        level?: string
        page?: number
        perPage?: number
    }): Promise<PaginatedResult<any>> {
        try {
            if (!hasPermission(this.permissions, 'read_own_logs') && !hasPermission(this.permissions, 'read_all_logs')) {
                throw new PermissionError('read_own_logs')
            }

            const page = filters?.page ?? 1
            const perPage = filters?.perPage ?? 20

            const response = await this.api.request('logs.index', {
                query: { ...filters, page, perPage },
            } as any)

            const data = (response as any).data
            const meta = (response as any).meta as PaginationMeta

            const fetchPage = (p: number) =>
                this.logs({ ...filters, page: p, perPage })

            return paginatedSuccess(data, meta, fetchPage)
        } catch (err) {
            return paginatedFailure(convertTuyauError(err, 'GET', '/logs') as LinxError)
        }
    }
}

// ── AuthenticatedLinxClient ─────────────────────────────────────────

class AuthenticatedLinxClientImpl extends SessionClientImpl {
    private _api: ApiClient
    private _apiKey: string | undefined
    private _setToken: ((token: string) => void) | undefined
    private _generateKeyPair: (() => Promise<JsonWebKey | null>) | undefined
    private _clearKeyPair: (() => void) | undefined

    constructor(
        api: ApiClient,
        permissions: EffectivePermission[],
        apiKey?: string,
        setToken?: (token: string) => void,
        generateKeyPair?: () => Promise<JsonWebKey | null>,
        clearKeyPair?: () => void,
    ) {
        super(api, permissions)
        this._api = api
        this._apiKey = apiKey
        this._setToken = setToken
        this._generateKeyPair = generateKeyPair
        this._clearKeyPair = clearKeyPair
    }

    async as(userAccountId?: string): Promise<SessionClientInstance> {
        // Re-authenticate with API key to get a fresh session token
        if (this._apiKey && this._setToken) {
            this._setToken(this._apiKey)
        }

        // Clear previous keypair and generate a new one for the new session
        this._clearKeyPair?.()
        const publicKey = this._generateKeyPair ? await this._generateKeyPair() : null

        const result = await this._api.request('auth.as', {
            body: {
                userAccountId: userAccountId ?? undefined,
                publicKey: publicKey ?? undefined,
            },
        }) as {
            permissions: EffectivePermission[]
            sessionToken?: { token: string }
        }

        // Switch to session token for subsequent requests
        if (result.sessionToken?.token && this._setToken) {
            this._setToken(result.sessionToken.token)
        }

        return new SessionClient(this._api, result.permissions)
    }
}

// ── LinxClient (unauthenticated) ────────────────────────────────────

class LinxClientImpl {
    private api: ApiClient
    private _setToken: (token: string) => void
    private _generateKeyPair: () => Promise<JsonWebKey | null>
    private _clearKeyPair: () => void
    private _apiKey: string | undefined

    constructor(config: LinxClientConfig) {
        const { client, setToken, generateKeyPair, clearKeyPair } = createApiClient(config)
        this.api = client
        this._setToken = setToken
        this._generateKeyPair = generateKeyPair
        this._clearKeyPair = clearKeyPair
    }

    async register(data: { email: string; password: string; accountType: 'Person' | 'Organization'; name?: string }) {
        return this.api.request('auth.register', { body: data } as any)
    }

    async authenticate(apiKey: string): Promise<AuthenticatedLinxClientInstance> {
        this._apiKey = apiKey
        this._setToken(apiKey)

        // Generate a DPoP keypair if crypto is available
        const publicKey = await this._generateKeyPair()

        const result = await this.api.request('auth.as', {
            body: { publicKey: publicKey ?? undefined },
        }) as {
            permissions: EffectivePermission[]
            sessionToken?: { token: string }
        }

        // Use session token for subsequent requests if provided
        if (result.sessionToken?.token) {
            this._setToken(result.sessionToken.token)
        }

        return new AuthenticatedLinxClient(
            this.api, result.permissions, this._apiKey, this._setToken,
            this._generateKeyPair, this._clearKeyPair,
        )
    }
}

// ── Exports with type-safe constructors ─────────────────────────────

export const LinxClient = LinxClientImpl as unknown as {
    new (config: LinxClientConfig): LinxClientInstance
}

export const AuthenticatedLinxClient = AuthenticatedLinxClientImpl as unknown as {
    new (
        api: ApiClient, permissions: EffectivePermission[], apiKey?: string,
        setToken?: (token: string) => void,
        generateKeyPair?: () => Promise<JsonWebKey | null>,
        clearKeyPair?: () => void,
    ): AuthenticatedLinxClientInstance
}

export const SessionClient = SessionClientImpl as unknown as {
    new (api: ApiClient, permissions: EffectivePermission[]): SessionClientInstance
}
