import type { ApiClient } from './api-client.js'
import type { ChangeTracker } from './change-tracker.js'
import type { SerializedFactoid } from './hydrated-entity.js'
import { convertTuyauError } from './api-client.js'
import { Factoid } from './factoid.js'
import { PaginatedCollection } from './paginated-collection.js'

/**
 * A root-level factoid on a hydrated entity, extending the base Factoid
 * with mutation methods, suggestion support, and dirty tracking.
 *
 * Suggestions are pre-loaded in the background after entity assembly
 * and accessible synchronously via the `.suggestions` property.
 *
 * All mutation methods throw LinxError on failure.
 *
 * toString() returns the current value for natural template usage:
 *   `<h1>${entity.name}</h1>` // renders the value string
 */
export class RootFactoid<T = unknown, TType extends string = string> extends Factoid<T, TType> {
    suggestions: PaginatedCollection<Factoid<T>>

    private tracker: ChangeTracker

    constructor(raw: SerializedFactoid, api: ApiClient, tracker: ChangeTracker) {
        super(raw, api)
        this.tracker = tracker
        this.suggestions = new PaginatedCollection<Factoid<T>>()
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
        this.tracker.markUpdated(this.entityId, this.apiId, this.attribute, apiValue)
    }

    /**
     * Suggest an alternative value for this attribute.
     * Creates a new factoid with isCurrent: false.
     *
     * Throws LinxError on failure.
     */
    async suggest(
        value: T,
        source?: { ref?: string; notes?: string },
    ): Promise<void> {
        try {
            await this.api.request('factoids.suggest', {
                params: { id: this.apiId },
                body: { value, source: source ?? {} },
            })
        } catch (err) {
            throw convertTuyauError(err, 'POST', `/factoids/${this.apiId}/suggest`)
        }
    }

    /**
     * Verify this factoid as the entity owner.
     * Only available if the authenticated user has an approved ownership claim
     * for the entity this factoid belongs to.
     * Verified factoids receive an exponential confidence boost.
     *
     * Throws LinxError on failure.
     */
    async verify(): Promise<void> {
        try {
            await this.api.request('verifications.store', {
                params: { id: this.apiId },
            } as any)
            this.verified = true
        } catch (err) {
            throw convertTuyauError(err, 'POST', `/factoids/${this.apiId}/verify`)
        }
    }

    /**
     * Archive this factoid — marks it as no longer current.
     * The factoid is not deleted; it becomes a historical record.
     *
     * Throws LinxError on failure.
     */
    async archive(): Promise<void> {
        try {
            await this.api.request('factoids.archive', {
                params: { id: this.apiId },
            })
            this.isCurrent = false
            this.tracker.markArchived(this.entityId, this.apiId, this.attribute)
        } catch (err) {
            throw convertTuyauError(err, 'DELETE', `/factoids/${this.apiId}`)
        }
    }
}
