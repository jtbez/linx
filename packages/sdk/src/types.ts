import type { SchemaTypeMap, ActivityLogContract, FilterCondition } from '@linxhq/core'
import type { HydratedEntityInstance } from './hydrated-entity.js'
import type { RootFactoid } from './root-factoid.js'
import type { PaginatedResult } from './result.js'

// ── Inspection types ───────────────────────────────────────────────

/** Serializable snapshot of the state manager's contents */
export interface StateSnapshot {
    entities: Record<string, { id: string; type: string; additionalType: string | null }>
    factoids: Record<string, { id: string; entityId: string; attribute: string; value: unknown; type: string; confidenceScore: number }>
}

// ── Permission actions ──────────────────────────────────────────────

export type PermissionAction =
    | 'read'
    | 'create'
    | 'update'
    | 'vote'
    | 'suggest'
    | 'archive'
    | 'admin'
    | 'create_api_key'
    | 'read_own_logs'
    | 'read_all_logs'
    | 'report'
    | 'claim'
    | 'verify'
    | 'review_claims'
    | 'review_reports'

export interface EffectivePermission {
    action: PermissionAction
    scope: string
}

// ── Registration types ──────────────────────────────────────────────

export interface RegisterInput {
    email: string
    password: string
    accountType: 'Person' | 'Organization'
    name?: string
}

export interface RegisterResult {
    userAccount: { id: string; entityId: string; email: string }
    token: { type: string; token: string }
}

// ── Auth context returned by POST /auth/as ──────────────────────────

export interface AuthAsResult {
    userAccount: { id: string; entityId: string; email: string } | null
    application: { id: string; entityId: string }
    permissions: EffectivePermission[]
}

// ── Permission-filtered type accessor ───────────────────────────────

/** Read-only accessor: get by ID, list, and count */
interface ReadAccessor<TData> {
    (id: string, options?: { depth?: number }): Promise<HydratedEntityInstance<TData>>
    get(id: string, options?: { depth?: number }): Promise<HydratedEntityInstance<TData>>
    list(options?: {
        page?: number
        perPage?: number
        filters?: Record<string, string>
        /** Structured filter conditions with type-safe field paths and operators */
        where?: FilterCondition<TData>[]
        /** How many levels of entity refs filters can traverse (default: 2, max: 3) */
        filterDepth?: number
        /** How many levels of entity refs to resolve in the response (default: 1, max: 5) */
        depth?: number
    }): Promise<PaginatedResult<HydratedEntityInstance<TData>>>
    /**
     * Create a scoped accessor with baked-in filter conditions.
     * The returned accessor carries the filters internally so you don't repeat them:
     * ```typescript
     * const motorways = session.place.where([
     *   { field: 'additionalType', op: 'eq', value: 'motorway' }
     * ])
     * motorways.list()       // filtered
     * motorways.meta()       // { count, total } without fetching
     * motorways.state()      // cached filtered results
     * motorways.count()      // filtered count
     * motorways.subscribe(cb) // filtered subscription
     * ```
     */
    where(
        conditions: FilterCondition<TData>[],
        options?: { filterDepth?: number; depth?: number; perPage?: number },
    ): QueryAccessor<TData>
    /** Synchronous metadata about the current state. Unlike count(), does not trigger a background fetch. */
    meta(filters?: Record<string, string>, where?: FilterCondition<TData>[]): AccessorMeta
    /** Synchronous access to cached entities. Triggers a background list() if empty. */
    state(filters?: Record<string, string>, where?: FilterCondition<TData>[]): HydratedEntityInstance<TData>[]
    /** Synchronous count from cached pagination meta. Triggers a background list() if empty. Returns 0 until data arrives. */
    count(filters?: Record<string, string>, where?: FilterCondition<TData>[]): number
    /**
     * Subscribe to state changes for this type. Callback fires when list() updates state.
     * Returns an unsubscribe function.
     */
    subscribe(callback: () => void, filters?: Record<string, string>, where?: FilterCondition<TData>[]): () => void
}

/** Synchronous metadata about the current accessor state (no network calls) */
export interface AccessorMeta {
    /** Number of entities currently held in local state for this accessor */
    count: number
    /** Total entities available on the server, or null if no data has been fetched yet */
    total: number | null
}

/** A scoped query returned by `.where()` — same as ReadAccessor but without `.where()` */
export type QueryAccessor<TData> = Omit<ReadAccessor<TData>, 'where'>

/** Create accessor */
interface CreateAccessor<TData> {
    create(data: Record<string, unknown>): Promise<HydratedEntityInstance<TData>>
}

/**
 * Builds a TypeAccessor that only includes methods the permissions allow.
 *
 * - 'read'   → accessor(id), accessor.list()
 * - 'create' → accessor.create()
 * - 'admin'  → all methods
 */
export type PermittedTypeAccessor<TData, P extends PermissionAction[]> =
    ('admin' extends P[number]
        ? ReadAccessor<TData> & CreateAccessor<TData>
        : ('read' extends P[number] ? ReadAccessor<TData> : unknown) &
          ('create' extends P[number] ? CreateAccessor<TData> : unknown)
    )

// ── Permission-filtered factoid methods ─────────────────────────────

/**
 * A RootFactoid filtered by permissions.
 * Methods that require permissions are only present when the permission is granted.
 * The type parameter T preserves the value type from the Schema.org definition.
 *
 * Suggestions are always available (pre-loaded sync property, not permission-gated).
 */
export type PermittedFactoid<T, P extends PermissionAction[]> =
    Pick<RootFactoid<T>, 'id' | 'entityId' | 'attribute' | 'type' | 'value' | 'confidenceScore' | 'isCurrent' | 'verified' | 'confidence' | 'source' | 'suggestions' | 'toString'> &
    ('vote' extends P[number] ? Pick<RootFactoid<T>, 'upvote' | 'downvote'> : unknown) &
    ('suggest' extends P[number] ? Pick<RootFactoid<T>, 'suggest'> : unknown) &
    ('archive' extends P[number] ? Pick<RootFactoid<T>, 'archive'> : unknown) &
    ('report' extends P[number] ? Pick<RootFactoid<T>, 'report'> : unknown) &
    ('verify' extends P[number] ? Pick<RootFactoid<T>, 'verify'> : unknown) &
    ('admin' extends P[number] ? Pick<RootFactoid<T>, 'upvote' | 'downvote' | 'suggest' | 'archive' | 'report' | 'verify'> : unknown)

// ── Session client instance type ────────────────────────────────────

/**
 * The public type of a permission-scoped session client.
 * Entity type accessors are filtered by permissions.
 */
export type SessionClientInstance<P extends PermissionAction[] = PermissionAction[]> = {
    clearCache(): void
    invalidate(id: string): void
    readonly permissions: EffectivePermission[]
    /** Returns the raw API response from the most recent entity request */
    getLastRawResponse(): import('./hydrated-entity.js').EntityResponse | null
    /** Returns a snapshot of all cached entities and factoids in the state manager */
    getStateSnapshot(): StateSnapshot
    /** Query activity logs. Requires read_own_logs or read_all_logs permission. */
    logs(filters?: {
        action?: string
        category?: string
        entityId?: string
        factoidId?: string
        level?: string
        page?: number
        perPage?: number
    }): Promise<PaginatedResult<ActivityLogContract['Data']>>
    /** Query claims. Requires review_claims permission for all claims, or claim permission for own. */
    claims(filters?: {
        status?: 'pending' | 'approved' | 'rejected'
        page?: number
        perPage?: number
    }): Promise<PaginatedResult<unknown>>
    /** Query reports on a factoid. */
    reports(factoidId: string, filters?: {
        status?: 'open' | 'reviewed' | 'resolved' | 'dismissed'
        page?: number
        perPage?: number
    }): Promise<PaginatedResult<unknown>>
} & {
    [K in keyof SchemaTypeMap]: PermittedTypeAccessor<SchemaTypeMap[K], P>
}

// ── Authenticated client instance type ──────────────────────────────

/**
 * An authenticated application client.
 *
 * This is itself a fully functional SessionClient (app-only mode) —
 * any entity/factoid operations performed directly on this client will
 * be attributed to the application only (no user on the Source).
 *
 * Call .as(userAccountId) to start a user-scoped session where Sources
 * reference both the application and the user. Call .as() with no
 * arguments to explicitly return to app-only mode.
 */
export type AuthenticatedLinxClientInstance = SessionClientInstance & {
    /**
     * Start a session as a specific UserAccount.
     * Validates ownership via POST /auth/as and returns a permission-scoped
     * client where Sources reference both the user and the application.
     *
     * Call with no arguments (or undefined) to return to app-only mode.
     */
    as(userAccountId?: string): Promise<SessionClientInstance>
}

// ── Unauthenticated client instance type ────────────────────────────

export interface LinxClientInstance {
    /**
     * Register a new UserAccount (Person or Organization).
     * This is the only mutation available without authentication.
     */
    register(data: RegisterInput): Promise<RegisterResult>

    /**
     * Authenticate using an API key. Returns an authenticated client
     * that can interact as the application directly, or call .as()
     * to start a user-scoped session.
     */
    authenticate(apiKey: string): Promise<AuthenticatedLinxClientInstance>
}

export interface LinxClientConfig {
    baseUrl: string
    headers?: Record<string, string>
    /**
     * Optional crypto adapter for DPoP proof-of-possession.
     * When provided, every request is signed with a client-generated keypair,
     * making stolen API keys cryptographically useless.
     *
     * Use `WebCryptoAdapter` for browsers, `NodeCryptoAdapter` for Node.js/React Native,
     * or `detectCryptoAdapter()` for automatic environment detection.
     */
    cryptoAdapter?: import('./crypto/crypto-adapter.js').CryptoAdapter
}
