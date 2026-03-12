/**
 * Filter types for the Linx search system.
 *
 * Used by both the API (to validate and apply filters) and the SDK
 * (to provide type-safe filter conditions per Schema.org type).
 */

// ── Filter operators ────────────────────────────────────────────────

export type FilterOp =
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'exists'

// ── Entity-level fields ─────────────────────────────────────────────

/** Fields that live on the entities table (not factoids) */
export const ENTITY_LEVEL_FIELDS = new Set([
    'type',
    'additionalType',
    'createdAt',
    'updatedAt',
] as const)

export type EntityField = 'type' | 'additionalType' | 'createdAt' | 'updatedAt'

// ── Type-safe dot-notation paths ────────────────────────────────────

/** Unwrap array types to get the element type */
type Unwrap<T> = T extends readonly (infer U)[] ? U : T

/** Depth limiter — maps a depth number to the next lower depth */
type Prev = [never, 0, 1, 2]

/**
 * Recursively builds dot-notation paths from a Schema.org interface.
 *
 * For a type like GasStation with properties `name: string`, `geo: GeoCoordinates`,
 * `containedInPlace: Place`, this produces:
 *   'name' | 'geo' | 'containedInPlace' | 'geo.latitude' | 'containedInPlace.name' | ...
 *
 * Bounded by depth D to prevent infinite recursion on circular types
 * (e.g., Place.containedInPlace → Place).
 */
type DotPaths<T, D extends number = 2> =
    [D] extends [never] ? never :
    {
        [K in keyof T & string]:
            | K
            | (NonNullable<Unwrap<NonNullable<T[K]>>> extends Record<string, any>
                ? `${K}.${DotPaths<NonNullable<Unwrap<NonNullable<T[K]>>>, Prev[D]> & string}`
                : never)
    }[keyof T & string]

/**
 * All valid filter field paths for a given Schema.org type.
 * Includes entity-level fields and dot-notation factoid paths.
 */
export type FilterField<TData> = EntityField | DotPaths<TData>

// ── Filter condition ────────────────────────────────────────────────

/**
 * A single filter condition for the search endpoint.
 *
 * @template TData - The Schema.org type, used to narrow `field` to valid paths.
 *
 * @example
 * ```typescript
 * // Direct factoid filter
 * { field: 'name', op: 'eq', value: 'Membury Services' }
 *
 * // Nested reference filter
 * { field: 'containedInPlace.name', op: 'eq', value: 'M1' }
 *
 * // Existence check
 * { field: 'amenityFeature', op: 'exists' }
 * ```
 */
export interface FilterCondition<TData = Record<string, unknown>> {
    field: FilterField<TData>
    op: FilterOp
    value?: unknown
}
