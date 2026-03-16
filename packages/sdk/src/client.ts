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
import { paginatedSuccess } from './result.js'
import type { PaginatedResult, PaginationMeta } from './result.js'
import type { FilterCondition } from '@linxhq/core'
import type {
    LinxClientConfig,
    LinxClientInstance,
    AuthenticatedLinxClientInstance,
    SessionClientInstance,
    StateSnapshot,
    EffectivePermission,
    PermissionAction,
    AccessorMeta,
    FacetEntry,
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
 * All API calls throw LinxError on failure — use try/catch or .catch()
 * to handle errors. Successful calls return data directly.
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
        ): Promise<HydratedEntity> => {
            requirePermission(perms, 'read')

            const cached = this.state.getEntity(id)
            if (cached && !options?.depth) return cached

            const depth = options?.depth ?? 1
            // Note: query params are cast because Tuyau's registry generator
            // doesn't auto-detect query validators on GET routes. Response
            // type is still fully inferred from the controller return type.
            let response: EntityResponse
            try {
                response = await this.api.request('entities.show', {
                    params: { type: rootType, id },
                    query: { depth },
                } as any) as EntityResponse
            } catch (err) {
                throw convertTuyauError(err, 'GET', `/${rootType}/${id}`)
            }

            this._lastRawResponse = response

            const rawRoot = response.entities.find((e) => e.id === id)
            if (!rawRoot) throw new Error(`Entity ${id} not found in response`)

            const entity = new HydratedEntity(rawRoot, response, this.api, this.tracker)
            this.state.setEntity(id, entity)
            this.registerAndLoadSuggestions(entity)
            return entity
        }

        /** Build a cache key for pagination state from type + filters + where */
        const paginationKey = (filters?: Record<string, string>, where?: FilterCondition[]) => {
            const sortedWhere = where?.length
                ? [...where].sort((a, b) => a.field.localeCompare(b.field))
                : undefined
            return JSON.stringify({ schemaType, ...filters, ...(sortedWhere ? { where: sortedWhere } : {}) })
        }

        const fetchPage = async (
            page: number,
            perPage: number,
            filters?: Record<string, string>,
            where?: FilterCondition[],
            filterDepth?: number,
            depth?: number,
        ): Promise<PaginatedResult<HydratedEntity>> => {
            requirePermission(perms, 'read')

            let response: EntityResponse & { meta: PaginationMeta }

            if (where?.length) {
                // Use POST /:type/search for structured filter queries
                try {
                    response = await this.api.request('entities.search', {
                        params: { type: rootType },
                        body: {
                            where: where.map((w) => ({
                                ...w,
                                // Inject additionalType filter for subtypes
                                ...(schemaType !== rootType && w.field === 'additionalType' ? {} : {}),
                            })),
                            page,
                            perPage,
                            depth: depth ?? 1,
                            filterDepth,
                        },
                    } as any) as EntityResponse & { meta: PaginationMeta }
                } catch (err) {
                    throw convertTuyauError(err, 'POST', `/${rootType}/search`)
                }
            } else {
                // Use existing GET /:type for simple queries
                try {
                    response = await this.api.request('entities.index', {
                        params: { type: rootType },
                        query: {
                            depth: depth ?? 1,
                            page,
                            perPage,
                            ...(schemaType !== rootType ? { additionalType: schemaType } : {}),
                            ...filters,
                        },
                    } as any) as EntityResponse & { meta: PaginationMeta }
                } catch (err) {
                    throw convertTuyauError(err, 'GET', `/${rootType}`)
                }
            }

            this._lastRawResponse = response

            const rootIds = new Set(
                response.entities
                    .filter((e) => schemaType !== rootType
                        ? e.additionalType === schemaType
                        : e.type === rootType)
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

            const meta = response.meta as PaginationMeta
            const key = paginationKey(filters, where)
            this.state.setPagination(key, meta, entities.map((e) => e.id))

            return paginatedSuccess(
                entities,
                meta,
                (p) => fetchPage(p, perPage, filters, where, filterDepth, depth),
            )
        }

        accessor.get = accessor

        /**
         * List entities of this type.
         *
         * - If an explicit `page` is provided, fetches that page.
         * - If no page is provided and data already exists in state for this
         *   type+filters, automatically fetches the next page.
         * - If no data exists in state, fetches page 1.
         *
         * Supports structured `where` conditions for rich filtering:
         * ```typescript
         * session.gasStation.list({
         *   where: [
         *     { field: 'containedInPlace.name', op: 'eq', value: 'M1' }
         *   ]
         * })
         * ```
         */
        accessor.list = async (options?: {
            page?: number
            perPage?: number
            filters?: Record<string, string>
            where?: FilterCondition[]
            filterDepth?: number
            depth?: number
        }): Promise<PaginatedResult<HydratedEntity>> => {
            const perPage = options?.perPage ?? 20
            const where = options?.where
            const filters = options?.filters
            const filterDepth = options?.filterDepth
            const depth = options?.depth

            if (options?.page != null) {
                return fetchPage(options.page, perPage, filters, where, filterDepth, depth)
            }

            const key = paginationKey(filters, where)
            const existing = this.state.getPagination(key)

            if (existing) {
                const nextPage = existing.currentPage + 1
                if (existing.currentPage >= existing.meta.lastPage) {
                    // Already on the last page — return the cached entities
                    const cachedEntities = existing.entityIds
                        .slice((existing.currentPage - 1) * perPage)
                        .map((id) => this.state.getEntity(id))
                        .filter((e): e is HydratedEntity => e != null)
                    return paginatedSuccess(
                        cachedEntities,
                        existing.meta,
                        (p) => fetchPage(p, perPage, filters, where, filterDepth, depth),
                    )
                }
                return fetchPage(nextPage, perPage, filters, where, filterDepth, depth)
            }

            return fetchPage(1, perPage, filters, where, filterDepth, depth)
        }

        /**
         * Synchronous access to cached facet values for an attribute.
         *
         * Returns cached facets immediately if available, otherwise triggers
         * a background fetch and returns []. Subscribers will be notified
         * when the data arrives.
         */
        const facetsBaseKey = `facets:${schemaType}`

        accessor.facets = (attribute: string): FacetEntry[] => {
            const facetsKey = JSON.stringify({ schemaType, attribute })
            const cached = this.state.getFacets(facetsKey)
            if (cached) return cached

            // No cached data — fire background fetch to populate state
            if (hasPermission(perms, 'read')) {
                (async () => {
                    try {
                        const response = await this.api.request('entities.facets', {
                            params: { type: rootType },
                            query: {
                                attribute,
                                ...(schemaType !== rootType ? { additionalType: schemaType } : {}),
                            },
                        } as any) as { data: FacetEntry[] }
                        this.state.setFacets(facetsKey, response.data)
                        this.state.notify(facetsBaseKey)
                    } catch {
                        // swallow — caller can retry
                    }
                })()
            }
            return []
        }

        /**
         * Synchronous metadata about the current state.
         *
         * Returns the count of entities currently in local state and the
         * total available on the server. Unlike count(), does NOT trigger
         * a background list() fetch when no data exists.
         */
        accessor.meta = (filters?: Record<string, string>, where?: FilterCondition[]): AccessorMeta => {
            const key = paginationKey(filters, where)
            const existing = this.state.getPagination(key)

            return {
                count: existing?.entityIds.length ?? 0,
                total: existing?.meta.total ?? null,
            }
        }

        /**
         * Synchronous access to cached entities for this type.
         *
         * Returns all entities currently in state from previous list() calls.
         * If no data exists in state, triggers a background list() fetch —
         * subscribers will be notified when data arrives.
         */
        accessor.state = (filters?: Record<string, string>, where?: FilterCondition[]): HydratedEntity[] => {
            const key = paginationKey(filters, where)
            const existing = this.state.getPagination(key)

            if (existing) {
                return existing.entityIds
                    .map((id) => this.state.getEntity(id))
                    .filter((e): e is HydratedEntity => e != null)
            }

            // No data — fire background list() to populate state
            if (hasPermission(perms, 'read')) {
                fetchPage(1, 20, filters, where).catch(() => {})
            }
            return []
        }

        /**
         * Synchronous count of entities for this type.
         *
         * Returns the total from cached pagination metadata if available.
         * If no data exists in state, triggers a background list() fetch —
         * subscribers will be notified when data arrives. Returns 0 until then.
         */
        accessor.count = (filters?: Record<string, string>, where?: FilterCondition[]): number => {
            const key = paginationKey(filters, where)
            const existing = this.state.getPagination(key)

            if (existing) {
                return existing.meta.total
            }

            // No cached data — fire background list() to populate state
            if (hasPermission(perms, 'read')) {
                fetchPage(1, 1, filters, where).catch(() => {})
            }
            return 0
        }

        /**
         * Subscribe to state changes for this type.
         *
         * The callback is invoked whenever list() completes and updates
         * the internal state for this type+filters combination.
         * Returns an unsubscribe function.
         *
         * Compatible with React's useSyncExternalStore:
         *   useSyncExternalStore(
         *     (cb) => session.gasStation.subscribe(cb),
         *     () => session.gasStation.state(),
         *   )
         */
        accessor.subscribe = (
            callback: () => void,
            filters?: Record<string, string>,
            where?: FilterCondition[],
        ): (() => void) => {
            const key = paginationKey(filters, where)
            const unsubPagination = this.state.subscribe(key, callback)
            const unsubFacets = this.state.subscribe(facetsBaseKey, callback)
            return () => { unsubPagination(); unsubFacets() }
        }

        accessor.where = (
            conditions: FilterCondition[],
            opts?: { filterDepth?: number; depth?: number; perPage?: number },
        ) => {
            const scopedPerPage = opts?.perPage ?? 20
            const scopedFilterDepth = opts?.filterDepth
            const scopedDepth = opts?.depth

            const scoped = async (id: string, options?: { depth?: number }) => {
                return accessor(id, options)
            }
            scoped.get = scoped

            scoped.list = async (options?: {
                page?: number
                perPage?: number
                filters?: Record<string, string>
                where?: FilterCondition[]
                filterDepth?: number
                depth?: number
            }) => {
                return accessor.list({
                    ...options,
                    where: options?.where ?? conditions,
                    filterDepth: options?.filterDepth ?? scopedFilterDepth,
                    depth: options?.depth ?? scopedDepth,
                    perPage: options?.perPage ?? scopedPerPage,
                })
            }

            scoped.facets = (attribute: string) => accessor.facets(attribute)
            scoped.meta = (filters?: Record<string, string>, where?: FilterCondition[]) =>
                accessor.meta(filters, where ?? conditions)
            scoped.state = (filters?: Record<string, string>, where?: FilterCondition[]) =>
                accessor.state(filters, where ?? conditions)
            scoped.count = (filters?: Record<string, string>, where?: FilterCondition[]) =>
                accessor.count(filters, where ?? conditions)
            scoped.subscribe = (
                callback: () => void,
                filters?: Record<string, string>,
                where?: FilterCondition[],
            ) => accessor.subscribe(callback, filters, where ?? conditions)

            return scoped
        }

        accessor.create = async (data: Record<string, unknown>): Promise<HydratedEntity> => {
            requirePermission(perms, 'create')

            const attributes = Object.entries(data).map(([attribute, value]) => ({
                attribute,
                value,
                source: {},
            }))

            let response: EntityResponse
            try {
                response = await this.api.request('entities.batchStore', {
                    params: { type: rootType },
                    body: {
                        type: rootType,
                        additionalType: schemaType !== rootType ? schemaType : undefined,
                        attributes,
                    },
                } as any) as EntityResponse
            } catch (err) {
                throw convertTuyauError(err, 'POST', `/${rootType}/batch`)
            }

            this._lastRawResponse = response

            const rawRoot = response.entities[0]
            if (!rawRoot) throw new Error('No entity in batch create response')

            const entity = new HydratedEntity(rawRoot, response, this.api, this.tracker)
            this.state.setEntity(rawRoot.id, entity)
            this.registerAndLoadSuggestions(entity)
            return entity
        }

        return accessor
    }

    /**
     * Register all factoids from an entity in the state manager,
     * then fire a single batch request to load suggestions for all
     * factoids that don't already have suggestions in state.
     */
    private registerAndLoadSuggestions(entity: HydratedEntity): void {
        const factoids = (entity as any).getAllFactoids() as RootFactoid[]
        const needsSuggestions: string[] = []

        for (const factoid of factoids) {
            this.state.setFactoid(factoid.id, factoid)
            if (!this.state.hasSuggestions(factoid.id)) {
                needsSuggestions.push(factoid.id)
            }
        }

        if (needsSuggestions.length > 0) {
            this.loadSuggestionsBatch(needsSuggestions)
        }
    }

    /**
     * Fire-and-forget: fetch suggestions for multiple factoids in a single
     * batch request and attach them to each RootFactoid's `.suggestions`.
     */
    private async loadSuggestionsBatch(factoidIds: string[]): Promise<void> {
        try {
            const result = await this.api.request('factoids.batchSuggestions', {
                body: { ids: factoidIds },
            }) as { data: Record<string, SerializedFactoid[]> }

            for (const factoidId of factoidIds) {
                const rawSuggestions = result.data[factoidId] ?? []
                const suggestions = rawSuggestions.map(
                    (raw) => new Factoid(raw, this.api),
                )
                const fetchPage = (page: number) => this.fetchSuggestionsPage(factoidId, page)
                this.state.attachSuggestions(factoidId, suggestions, null, fetchPage)
            }
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
        const page = filters?.page ?? 1
        const perPage = filters?.perPage ?? 20

        let response: any
        try {
            response = await this.api.request('claims.index', {
                query: { ...filters, page, perPage },
            } as any)
        } catch (err) {
            throw convertTuyauError(err, 'GET', '/claims')
        }

        const data = response.data
        const meta = response.meta as PaginationMeta

        const fetchPage = (p: number) =>
            this.claims({ ...filters, page: p, perPage })

        return paginatedSuccess(data, meta, fetchPage)
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
        const page = filters?.page ?? 1
        const perPage = filters?.perPage ?? 20

        let response: any
        try {
            response = await this.api.request('reports.index', {
                params: { id: factoidId },
                query: { ...filters, page, perPage },
            } as any)
        } catch (err) {
            throw convertTuyauError(err, 'GET', `/factoids/${factoidId}/reports`)
        }

        const data = response.data
        const meta = response.meta as PaginationMeta

        const fetchPage = (p: number) =>
            this.reports(factoidId, { ...filters, page: p, perPage })

        return paginatedSuccess(data, meta, fetchPage)
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
        if (!hasPermission(this.permissions, 'read_own_logs') && !hasPermission(this.permissions, 'read_all_logs')) {
            throw new PermissionError('read_own_logs')
        }

        const page = filters?.page ?? 1
        const perPage = filters?.perPage ?? 20

        let response: any
        try {
            response = await this.api.request('logs.index', {
                query: { ...filters, page, perPage },
            } as any)
        } catch (err) {
            throw convertTuyauError(err, 'GET', '/logs')
        }

        const data = response.data
        const meta = response.meta as PaginationMeta

        const fetchPage = (p: number) =>
            this.logs({ ...filters, page: p, perPage })

        return paginatedSuccess(data, meta, fetchPage)
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
