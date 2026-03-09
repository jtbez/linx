import type { ApiClient } from './api-client.js'
import type { LinxError } from './errors.js'
import type { LinxResult } from './result.js'
import type { ChangeTracker } from './change-tracker.js'
import { convertTuyauError } from './api-client.js'
import { success, failure } from './result.js'
import { RootFactoid } from './root-factoid.js'
import { isEntityType } from '@linxhq/vine-schema-dot-org/classify'
import { isKeyedType, extractCollectionKey } from '@linxhq/core/factoid-map'
import type { LocationFeatureSpecification } from '@linxhq/vine-schema-dot-org'
import type { PropertyValue } from '@linxhq/vine-schema-dot-org'

/** Schema.org types that produce FactoidMaps at runtime (mirrors KEYED_TYPES) */
type KeyedStructuredValue = LocationFeatureSpecification | PropertyValue

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The serialized entity shape returned by the API (inferred from controller) */
export type SerializedEntity = {
    id: string
    type: string
    additionalType: string | null
    createdAt: unknown
    updatedAt: unknown
}

/** The serialized factoid shape returned by the API (inferred from controller) */
export type SerializedFactoid = {
    id: string
    entityId: string
    attribute: string
    value: unknown
    type: string
    confidenceScore: number
    isCurrent: boolean
    verified: boolean
    source: {
        id: string
        type: string
        userAccountId: string | null
        applicationId: string | null
        ref: string | null
        notes: string | null
    } | null
    createdAt: unknown
}

/** The flat API response shape shared by entity endpoints */
export type EntityResponse = {
    entities: SerializedEntity[]
    factoids: SerializedFactoid[]
}

/** A map of factoids keyed by a value-derived string (e.g., amenity key) */
export type FactoidMap<T = unknown> = Record<string, RootFactoid<T>>

/**
 * Extract the element type from T if it's an array.
 */
type ElementType<T> =
    T extends (infer U)[] ? U
    : T extends readonly (infer U)[] ? U
    : T

/**
 * Maps a single Schema.org property type to its hydrated form.
 *
 * - Scalars (string, number, boolean) → RootFactoid<T>
 * - Object types → FactoidMap<T> for keyed StructuredValue types (e.g., amenityFeature)
 *                   or RootFactoid<HydratedEntityInstance<T>> for entity refs (e.g., containedInPlace)
 *   Runtime discrimination via isKeyedType() and isEntityType().
 */
type HydratedProperty<T> =
    T extends string | number | boolean | null | undefined
        ? RootFactoid<T>
        : T extends KeyedStructuredValue
            ? FactoidMap<T>
            : T extends Record<string, any>
                ? RootFactoid<HydratedEntityInstance<T>>
                : RootFactoid<T>

/**
 * Maps Schema.org property keys to their hydrated types.
 * Runtime discrimination via factoid.type + isEntityType().
 */
type HydratedAttributes<TData> = {
    [K in keyof TData]-?: HydratedProperty<
        NonNullable<ElementType<NonNullable<TData[K]>>>
    >
}

/**
 * The public type of HydratedEntity.
 *
 * When TData is provided (e.g., from a Schema.org type like GasStation), only known
 * properties are available with autocomplete. When omitted, falls back to
 * open-ended Record access for backward compatibility.
 */
export type HydratedEntityInstance<TData = Record<string, unknown>> =
    HydratedEntityImpl & HydratedAttributes<TData>

/**
 * A hydrated entity assembled from the flat { entities, factoids } API response.
 *
 * All properties are RootFactoid<T>. For entity-type factoids, the value is
 * replaced with the assembled HydratedEntity child at runtime. Use
 * isEntityType(factoid.type) to discriminate at runtime.
 *
 * One current factoid per attribute; alternatives appear as suggestions.
 *
 * Call entity.save() to persist all dirty factoid changes.
 */
class HydratedEntityImpl {
    readonly id: string
    readonly type: string
    readonly additionalType: string | null

    private attrs: Record<string, RootFactoid | FactoidMap> = {}
    private api: ApiClient
    private tracker: ChangeTracker

    constructor(
        raw: SerializedEntity,
        response: EntityResponse,
        api: ApiClient,
        tracker: ChangeTracker,
        visited = new Set<string>(),
    ) {
        this.id = raw.id
        this.type = raw.type
        this.additionalType = raw.additionalType

        this.api = api
        this.tracker = tracker

        // Prevent infinite loops for circular refs
        visited.add(raw.id)

        this.assemble(raw, response, visited)

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && prop in target.attrs) {
                    return target.attrs[prop]
                }
                return Reflect.get(target, prop, receiver)
            },
        })
    }

    private assemble(raw: SerializedEntity, response: EntityResponse, visited: Set<string>) {
        const entityMap = new Map(response.entities.map((e) => [e.id, e]))
        const myFactoids = response.factoids.filter((f) => f.entityId === raw.id)

        // Group factoids by attribute, sorted by confidence (highest first)
        const byAttribute = new Map<string, SerializedFactoid[]>()
        for (const factoid of myFactoids) {
            const group = byAttribute.get(factoid.attribute) ?? []
            group.push(factoid)
            byAttribute.set(factoid.attribute, group)
        }

        for (const [attribute, factoids] of byAttribute) {
            // Sort by confidence descending — highest confidence becomes current
            factoids.sort((a, b) => b.confidenceScore - a.confidenceScore)
            const current = factoids[0]

            if (isKeyedType(current.type)) {
                // Keyed StructuredValue → FactoidMap (plain record keyed by value-derived key)
                const map: FactoidMap = {}
                for (const f of factoids.filter((f) => f.isCurrent)) {
                    const key = extractCollectionKey(f.type, f.value)
                    if (key) {
                        map[key] = new RootFactoid(f, this.api, this.tracker)
                    }
                }
                this.attrs[attribute] = map
            } else if (isEntityType(current.type) &&
                typeof current.value === 'string' &&
                UUID_RE.test(current.value) &&
                entityMap.has(current.value) &&
                !visited.has(current.value)) {
                // Entity-type factoid: replace UUID value with assembled child
                const childRaw = entityMap.get(current.value)!
                const child = new HydratedEntityImpl(childRaw, response, this.api, this.tracker, new Set(visited))
                const hydratedFactoid = { ...current, value: child }
                this.attrs[attribute] = new RootFactoid(hydratedFactoid, this.api, this.tracker)
            } else {
                // Factoid-type or unresolvable entity ref: wrap as-is
                this.attrs[attribute] = new RootFactoid(current, this.api, this.tracker)
            }
        }
    }

    getAttribute(key: string): RootFactoid | FactoidMap | undefined {
        return this.attrs[key]
    }

    getAttributes(): Record<string, RootFactoid | FactoidMap> {
        return { ...this.attrs }
    }

    /**
     * Returns all RootFactoid instances on this entity.
     * Flattens FactoidMap entries so each RootFactoid gets registered
     * individually in the state manager for suggestion loading.
     */
    getAllFactoids(): RootFactoid[] {
        const result: RootFactoid[] = []
        for (const v of Object.values(this.attrs)) {
            if (v instanceof RootFactoid) {
                result.push(v)
            } else {
                // FactoidMap — plain record of RootFactoids
                result.push(...Object.values(v as FactoidMap))
            }
        }
        return result
    }

    /**
     * Persist all dirty factoids for this entity.
     * Sends only changed factoids via POST /:type/:entityId/factoids/batch.
     * Re-assembles the entity from the server response so local state stays fresh.
     */
    async save(): Promise<LinxResult<void>> {
        if (!this.tracker.hasDirty(this.id)) return success(undefined)

        const ops = this.tracker.getDirty(this.id)
        const operations = ops.map((op) => {
            if (op.kind === 'archive') return { attribute: op.attribute, archive: true }
            return { attribute: op.attribute, value: op.value, source: op.kind === 'new' ? op.source : undefined }
        })

        try {
            const response = await this.api.request('factoids.batchStore', {
                params: { type: this.type, entityId: this.id },
                body: { operations },
            })
            this.tracker.clear(this.id)

            // Re-assemble from fresh server response
            const rawRoot = response.entities.find((e) => e.id === this.id)
            if (rawRoot) {
                this.attrs = {}
                this.assemble(rawRoot, response, new Set([this.id]))
            }

            return success(undefined)
        } catch (err) {
            return failure(convertTuyauError(err, 'POST', `/${this.type}/${this.id}/factoids/batch`) as LinxError)
        }
    }

    /**
     * Submit an ownership claim for this entity.
     * The authenticated user must be linked to the Person/Organization
     * referenced in the "owner" factoid.
     */
    async claim(evidence?: string): Promise<LinxResult<unknown>> {
        try {
            const result = await this.api.request('claims.store', {
                params: { type: this.type, id: this.id },
                body: { evidence },
            } as any)
            return success(result)
        } catch (err) {
            return failure(convertTuyauError(err, 'POST', `/${this.type}/${this.id}/claim`) as LinxError)
        }
    }

    async archive(): Promise<LinxResult<void>> {
        const results: LinxResult<void>[] = []
        for (const attrValue of Object.values(this.attrs)) {
            if (attrValue instanceof RootFactoid) {
                results.push(await attrValue.archive())
            } else {
                for (const factoid of Object.values(attrValue as FactoidMap)) {
                    results.push(await factoid.archive())
                }
            }
        }
        const err = results.find((r) => r.isError)
        if (err && err.error) return failure(err.error)
        return success(undefined)
    }

    toString(): string {
        const name = this.attrs['name']
        if (name instanceof RootFactoid) return String(name.current)
        return `${this.type}:${this.id}`
    }
}

export const HydratedEntity = HydratedEntityImpl as unknown as {
    new <TData = Record<string, unknown>>(
        raw: SerializedEntity,
        response: EntityResponse,
        api: ApiClient,
        tracker: ChangeTracker,
        visited?: Set<string>,
    ): HydratedEntityInstance<TData>
}

export type HydratedEntity<TData = Record<string, unknown>> = HydratedEntityInstance<TData>
