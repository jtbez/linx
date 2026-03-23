import type { HydratedEntity } from './hydrated-entity.js'
import type { ChangeTracker } from './change-tracker.js'
import type { RootFactoid } from './root-factoid.js'
import type { Factoid } from './factoid.js'
import type { PaginationMeta } from './result.js'
import type { FacetEntry } from './types.js'
import { PaginatedCollection } from './paginated-collection.js'

/** Tracks pagination state for a specific schema type */
export interface TypePaginationState {
    meta: PaginationMeta
    currentPage: number
    entityIds: string[]
}

/**
 * Normalized state store for entities and factoids.
 *
 * Tracks entities by ID for deduplication, and factoids by ID
 * for background suggestion attachment. When suggestions arrive
 * for a factoid, they are automatically attached to the
 * RootFactoid's `.suggestions` property.
 *
 * Also tracks pagination state per schema type so that repeated
 * list() calls automatically advance to the next page, and count()
 * can return totals without an extra request.
 */
export class StateManager {
    private entities = new Map<string, HydratedEntity>()
    private factoids = new Map<string, RootFactoid>()
    private pagination = new Map<string, TypePaginationState>()
    private facets = new Map<string, FacetEntry[]>()
    private listeners = new Map<string, Set<() => void>>()

    constructor(private tracker: ChangeTracker) { }

    // ── Entity operations ───────────────────────────────────────

    getEntity(id: string): HydratedEntity | undefined {
        return this.entities.get(id)
    }

    setEntity(id: string, entity: HydratedEntity): void {
        this.entities.set(id, entity)
    }

    /** @deprecated Use getEntity instead */
    get(id: string): HydratedEntity | undefined {
        return this.getEntity(id)
    }

    /** @deprecated Use setEntity instead */
    set(id: string, entity: HydratedEntity): void {
        this.setEntity(id, entity)
    }

    invalidate(id: string): void {
        this.entities.delete(id)
        this.tracker.clear(id)
    }

    clear(): void {
        this.entities.clear()
        this.factoids.clear()
        this.pagination.clear()
        this.facets.clear()
    }

    // ── Pagination tracking ─────────────────────────────────────

    /** Get the pagination state for a schema type (keyed by schemaType + filters) */
    getPagination(key: string): TypePaginationState | undefined {
        return this.pagination.get(key)
    }

    /** Update pagination state after a successful list() fetch */
    setPagination(key: string, meta: PaginationMeta, entityIds: string[]): void {
        const existing = this.pagination.get(key)
        // Page 1 means a fresh query or refresh — reset entityIds rather than appending.
        // Pages > 1 are pagination advances (infinite scroll) and should append,
        // but always deduplicate to guard against any overlap between pages.
        let combined: string[]
        if (existing && meta.currentPage > 1) {
            const seen = new Set(existing.entityIds)
            const fresh = entityIds.filter((id) => !seen.has(id))
            combined = [...existing.entityIds, ...fresh]
        } else {
            combined = [...new Set(entityIds)]
        }
        this.pagination.set(key, {
            meta,
            currentPage: meta.currentPage,
            entityIds: combined,
        })
        this.notify(key)
    }

    // ── Facets cache ─────────────────────────────────────────────

    /** Get cached facets for a type + attribute key */
    getFacets(key: string): FacetEntry[] | undefined {
        return this.facets.get(key)
    }

    /** Store facets results and notify listeners */
    setFacets(key: string, entries: FacetEntry[]): void {
        this.facets.set(key, entries)
        this.notify(key)
    }

    // ── Subscription system ─────────────────────────────────────

    /** Subscribe to pagination state changes for a given key. Returns an unsubscribe function. */
    subscribe(key: string, callback: () => void): () => void {
        let set = this.listeners.get(key)
        if (!set) {
            set = new Set()
            this.listeners.set(key, set)
        }
        set.add(callback)
        return () => {
            set!.delete(callback)
            if (set!.size === 0) this.listeners.delete(key)
        }
    }

    /** Notify all listeners for a given key */
    notify(key: string): void {
        const set = this.listeners.get(key)
        if (set) {
            for (const cb of set) cb()
        }
    }

    /**
     * Returns a serializable snapshot of all tracked entities and factoids.
     * Useful for debugging and inspection in the playground.
     */
    snapshot(): { entities: Record<string, { id: string; type: string; additionalType: string | null }>; factoids: Record<string, { id: string; entityId: string; attribute: string; value: unknown; type: string; confidenceScore: number }> } {
        const entities: Record<string, { id: string; type: string; additionalType: string | null }> = {}
        for (const [id, entity] of this.entities) {
            entities[id] = { id: entity.id, type: entity.type, additionalType: entity.additionalType }
        }

        const factoids: Record<string, { id: string; entityId: string; attribute: string; value: unknown; type: string; confidenceScore: number }> = {}
        for (const [id, factoid] of this.factoids) {
            factoids[id] = {
                id: factoid.id,
                entityId: factoid.entityId,
                attribute: factoid.attribute,
                value: factoid.value,
                type: factoid.type,
                confidenceScore: factoid.confidenceScore,
            }
        }

        return { entities, factoids }
    }

    // ── Factoid operations ──────────────────────────────────────

    getFactoid(id: string): RootFactoid | undefined {
        return this.factoids.get(id)
    }

    setFactoid(id: string, factoid: RootFactoid): void {
        this.factoids.set(id, factoid)
    }

    /** Check if a factoid already has suggestions loaded */
    hasSuggestions(id: string): boolean {
        const factoid = this.factoids.get(id)
        if (!factoid) return false
        // meta is null on the default empty PaginatedCollection, non-null once attached
        return factoid.suggestions.meta !== null
    }

    /**
     * Attach pre-loaded suggestions to a tracked RootFactoid.
     * Called by the background suggestion loader after fetching.
     */
    attachSuggestions<T>(
        factoidId: string,
        suggestions: Factoid<T>[],
        meta: PaginationMeta | null,
        fetchPage: ((page: number) => Promise<PaginatedCollection<Factoid<T>>>) | null = null,
    ): void {
        const factoid = this.factoids.get(factoidId) as RootFactoid<T> | undefined
        if (factoid) {
            factoid.suggestions = new PaginatedCollection<Factoid<T>>(suggestions, meta, fetchPage)
        }
    }
}
