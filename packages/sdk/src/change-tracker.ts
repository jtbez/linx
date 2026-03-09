export type DirtyOperation =
    | { kind: 'update'; factoidId: string; attribute: string; value: unknown }
    | { kind: 'archive'; factoidId: string; attribute: string }
    | { kind: 'new'; attribute: string; value: unknown; source?: { ref?: string; notes?: string } }

/**
 * Tracks per-entity factoid mutations so entity.save() can
 * send only the changed factoids to the API.
 */
export class ChangeTracker {
    private ops = new Map<string, Map<string, DirtyOperation>>()

    markUpdated(entityId: string, factoidId: string, attribute: string, value: unknown): void {
        this.getOrCreate(entityId).set(factoidId, { kind: 'update', factoidId, attribute, value })
    }

    markArchived(entityId: string, factoidId: string, attribute: string): void {
        this.getOrCreate(entityId).set(factoidId, { kind: 'archive', factoidId, attribute })
    }

    markNew(entityId: string, attribute: string, value: unknown, source?: { ref?: string; notes?: string }): void {
        // Use a generated key for new (not-yet-persisted) factoids
        const key = `new:${attribute}`
        this.getOrCreate(entityId).set(key, { kind: 'new', attribute, value, source })
    }

    getDirty(entityId: string): DirtyOperation[] {
        return [...(this.ops.get(entityId)?.values() ?? [])]
    }

    hasDirty(entityId: string): boolean {
        const m = this.ops.get(entityId)
        return m !== undefined && m.size > 0
    }

    clear(entityId: string): void {
        this.ops.delete(entityId)
    }

    private getOrCreate(entityId: string): Map<string, DirtyOperation> {
        if (!this.ops.has(entityId)) {
            this.ops.set(entityId, new Map())
        }
        return this.ops.get(entityId)!
    }
}
