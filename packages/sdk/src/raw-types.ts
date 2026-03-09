/**
 * Re-exports the serialized API response types for backward compatibility.
 * These types now live in hydrated-entity.ts and are structurally matched
 * to the API controller return types via the Tuyau registry.
 */
export type { SerializedEntity as RawEntity, SerializedFactoid as RawFactoid, EntityResponse as RawEntityResponse } from './hydrated-entity.js'

export interface RawPaginatedEntityResponse {
    entities: import('./hydrated-entity.js').SerializedEntity[]
    factoids: import('./hydrated-entity.js').SerializedFactoid[]
    meta: {
        total: number
        perPage: number
        currentPage: number
        lastPage: number
        firstPage: number
    }
}
