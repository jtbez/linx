import type { ApiClient } from './api-client.js'
import type { SerializedFactoid } from './hydrated-entity.js'
import { convertTuyauError } from './api-client.js'

/**
 * Base factoid class with shared properties and methods.
 *
 * Used for suggestion items — has voting and metadata but no mutation
 * methods (setValue, suggest, archive) or nested suggestions.
 *
 * toString() returns the current value for natural template usage:
 *   `<h1>${suggestion}</h1>` // renders the value string
 */
export class Factoid<T = unknown, TType extends string = string> {
    readonly id: string
    readonly sourceFactoidId?: string
    readonly entityId: string
    readonly attribute: string
    readonly type: TType
    value: T
    confidenceScore: number
    isCurrent: boolean
    verified: boolean
    readonly source: SerializedFactoid['source']

    protected api: ApiClient

    constructor(raw: SerializedFactoid, api: ApiClient) {
        this.id = raw.id
        this.sourceFactoidId = raw.sourceFactoidId
        this.entityId = raw.entityId
        this.attribute = raw.attribute
        this.type = raw.type as unknown as TType
        this.value = raw.value as T
        this.confidenceScore = raw.confidenceScore
        this.isCurrent = raw.isCurrent
        this.verified = raw.verified ?? false
        this.source = raw.source
        this.api = api
    }

    /** The factoid ID to use for API operations (vote, report, etc.) */
    protected get apiId(): string {
        return this.sourceFactoidId ?? this.id
    }

    get confidence(): number {
        return this.confidenceScore
    }

    /**
     * Upvote this factoid — increases confidence.
     * Updates the local confidence score on success.
     *
     * Throws LinxError on failure.
     */
    async upvote(): Promise<void> {
        let result: any
        try {
            result = await this.api.request('factoids.vote', {
                params: { id: this.apiId },
                body: { direction: 'up' },
            })
        } catch (err) {
            throw convertTuyauError(err, 'POST', `/factoids/${this.apiId}/vote`)
        }
        this.confidenceScore = result.confidenceScore
    }

    /**
     * Downvote this factoid — decreases confidence (exponential penalty).
     * Updates the local confidence score on success.
     *
     * Throws LinxError on failure.
     */
    async downvote(): Promise<void> {
        let result: any
        try {
            result = await this.api.request('factoids.vote', {
                params: { id: this.apiId },
                body: { direction: 'down' },
            })
        } catch (err) {
            throw convertTuyauError(err, 'POST', `/factoids/${this.apiId}/vote`)
        }
        this.confidenceScore = result.confidenceScore
    }

    /**
     * Report a problem with this factoid.
     * Active reports reduce the factoid's confidence score.
     *
     * @param reason - Category: 'spam' | 'inaccurate' | 'incomplete' | 'defamatory' |
     *   'opinion_not_fact' | 'outdated' | 'duplicate' | 'offensive' | 'misleading' | 'copyright_violation'
     * @param description - Optional free-text explanation (max 2000 chars).
     *
     * Throws LinxError on failure.
     */
    async report(
        reason: string,
        description?: string,
    ): Promise<void> {
        try {
            await this.api.request('reports.store', {
                params: { id: this.apiId },
                body: { reason, description },
            } as any)
        } catch (err) {
            throw convertTuyauError(err, 'POST', `/factoids/${this.apiId}/report`)
        }
    }

    toString(): string {
        return String(this.value)
    }
}
