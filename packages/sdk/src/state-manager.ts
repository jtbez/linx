import type { HydratedEntity } from './hydrated-entity.js'
import type { ChangeTracker } from './change-tracker.js'
import type { RootFactoid } from './root-factoid.js'
import type { Factoid } from './factoid.js'
import type { PaginationMeta } from './result.js'
import { PaginatedCollection } from './paginated-collection.js'

/**
 * Normalized state store for entities and factoids.
 *
 * Tracks entities by ID for deduplication, and factoids by ID
 * for background suggestion attachment. When suggestions arrive
 * for a factoid, they are automatically attached to the
 * RootFactoid's `.suggestions` property.
 */
export class StateManager {
    private entities = new Map<string, HydratedEntity>()
    private factoids = new Map<string, RootFactoid>()

    constructor(private tracker: ChangeTracker) {}

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
                value: factoid.current,
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
