import type { ApiClient } from './api-client.js'
import type { LinxError } from './errors.js'
import type { LinxResult } from './result.js'
import type { ChangeTracker } from './change-tracker.js'
import type { SerializedFactoid } from './hydrated-entity.js'
import { convertTuyauError } from './api-client.js'
import { success, failure } from './result.js'
import { Factoid } from './factoid.js'
import { PaginatedCollection } from './paginated-collection.js'

/**
 * A root-level factoid on a hydrated entity, extending the base Factoid
 * with mutation methods, suggestion support, and dirty tracking.
 *
 * Suggestions are pre-loaded in the background after entity assembly
 * and accessible synchronously via the `.suggestions` property.
 *
 * toString() returns the current value for natural template usage:
 *   `<h1>${entity.name}</h1>` // renders the value string
 */
export class RootFactoid<T = unknown> extends Factoid<T> {
    suggestions: PaginatedCollection<Factoid<T>>

    private tracker: ChangeTracker

    constructor(raw: SerializedFactoid, api: ApiClient, tracker: ChangeTracker) {
        super(raw, api)
        this.tracker = tracker
        this.suggestions = new PaginatedCollection<Factoid<T>>()
    }

    get current(): T {
        return this.value
    }

    /**
     * Set the value locally and mark this factoid as dirty.
     * Call entity.save() to persist all dirty factoids.
     *
     * For entity-type factoids, pass the entity ID (UUID string) or a
     * HydratedEntity instance (its `.id` will be extracted for the API).
     */
    setValue(newValue: T): void {
        this.value = newValue
        // If the value is a HydratedEntity, send the UUID to the API
        const apiValue = (newValue != null && typeof newValue === 'object' && 'id' in newValue && 'type' in newValue)
            ? (newValue as { id: string }).id
            : newValue
        this.tracker.markUpdated(this.entityId, this.id, this.attribute, apiValue)
    }

    async suggest(
        value: T,
        source?: { ref?: string; notes?: string },
    ): Promise<LinxResult<unknown>> {
        try {
            const result = await this.api.request('factoids.suggest', {
                params: { id: this.id },
                body: { value, source: source ?? {} },
            })
            return success(result)
        } catch (err) {
            return failure(convertTuyauError(err, 'POST', `/factoids/${this.id}/suggest`) as LinxError)
        }
    }

    /**
     * Verify this factoid as the entity owner.
     * Only available if the authenticated user has an approved ownership claim
     * for the entity this factoid belongs to.
     * Verified factoids receive an exponential confidence boost.
     */
    async verify(): Promise<LinxResult<unknown>> {
        try {
            const result = await this.api.request('verifications.store', {
                params: { id: this.id },
            } as any)
            this.verified = true
            return success(result)
        } catch (err) {
            return failure(convertTuyauError(err, 'POST', `/factoids/${this.id}/verify`) as LinxError)
        }
    }

    async archive(): Promise<LinxResult<void>> {
        try {
            await this.api.request('factoids.archive', {
                params: { id: this.id },
            })
            this.isCurrent = false
            this.tracker.markArchived(this.entityId, this.id, this.attribute)
            return success(undefined)
        } catch (err) {
            return failure(convertTuyauError(err, 'DELETE', `/factoids/${this.id}`) as LinxError)
        }
    }
}
