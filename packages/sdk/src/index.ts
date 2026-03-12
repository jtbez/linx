export { LinxClient, AuthenticatedLinxClient, SessionClient } from './client.js'
export { createApiClient } from './api-client.js'
export type { ApiClient } from './api-client.js'
export type {
    LinxClientConfig,
    LinxClientInstance,
    AuthenticatedLinxClientInstance,
    SessionClientInstance,
    RegisterInput,
    RegisterResult,
    PermissionAction,
    EffectivePermission,
    PermittedTypeAccessor,
    QueryAccessor,
    StateSnapshot,
} from './types.js'
export type { HydratedEntity, HydratedEntityInstance, SerializedEntity, SerializedFactoid, EntityResponse, FactoidMap } from './hydrated-entity.js'
export { Factoid } from './factoid.js'
export { RootFactoid } from './root-factoid.js'
export { PaginatedCollection } from './paginated-collection.js'
export type { PageFetcher } from './paginated-collection.js'

/** @deprecated Use RootFactoid instead */
export { RootFactoid as HydratedFactoid } from './root-factoid.js'

export { ChangeTracker } from './change-tracker.js'
export type { DirtyOperation } from './change-tracker.js'
export type { RawEntity, RawFactoid, RawEntityResponse, RawPaginatedEntityResponse } from './raw-types.js'
export {
    LinxError,
    ValidationError,
    NotFoundError,
    PermissionError,
    AuthenticationError,
    RateLimitError,
    ServerError,
} from './errors.js'
export type { PaginatedResult, PaginationMeta } from './result.js'
export { isEntityType, isFactoidType, classifyProperty } from '@linxhq/vine-schema-dot-org/classify'
export type { ActivityLogContract } from '@linxhq/core'

// Crypto adapters for DPoP proof-of-possession
export type { CryptoAdapter, ProofPayload } from './crypto/crypto-adapter.js'
export { WebCryptoAdapter } from './crypto/web-crypto-adapter.js'
export { detectCryptoAdapter } from './crypto/index.js'

// NodeCryptoAdapter uses `node:crypto` which breaks browser bundlers (webpack/Next.js).
// Import it directly from the subpath when needed in Node.js/React Native contexts:
//   import { NodeCryptoAdapter } from '@linxhq/sdk/crypto/node-crypto-adapter'
