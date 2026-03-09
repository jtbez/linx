import type { ApiClient } from './api-client.js'
import type { LinxError } from './errors.js'
import type { LinxResult } from './result.js'
import type { SerializedFactoid } from './hydrated-entity.js'
import { convertTuyauError } from './api-client.js'
import { success, failure } from './result.js'

/**
 * Base factoid class with shared properties and methods.
 *
 * Used for suggestion items — has voting and metadata but no mutation
 * methods (setValue, suggest, archive) or nested suggestions.
 *
 * toString() returns the current value for natural template usage:
 *   `<h1>${suggestion}</h1>` // renders the value string
 */
export class Factoid<T = unknown> {
    readonly id: string
    readonly entityId: string
    readonly attribute: string
    readonly type: string
    value: T
    confidenceScore: number
    isCurrent: boolean
    verified: boolean
    readonly source: SerializedFactoid['source']

    protected api: ApiClient

    constructor(raw: SerializedFactoid, api: ApiClient) {
        this.id = raw.id
        this.entityId = raw.entityId
        this.attribute = raw.attribute
        this.type = raw.type
        this.value = raw.value as T
        this.confidenceScore = raw.confidenceScore
        this.isCurrent = raw.isCurrent
        this.verified = raw.verified ?? false
        this.source = raw.source
        this.api = api
    }

    get confidence(): number {
        return this.confidenceScore
    }

    async upvote(): Promise<LinxResult<void>> {
        try {
            const result = await this.api.request('factoids.vote', {
                params: { id: this.id },
                body: { direction: 'up' },
            })
            this.confidenceScore = result.confidenceScore
            return success(undefined)
        } catch (err) {
            return failure(convertTuyauError(err, 'POST', `/factoids/${this.id}/vote`) as LinxError)
        }
    }

    async downvote(): Promise<LinxResult<void>> {
        try {
            const result = await this.api.request('factoids.vote', {
                params: { id: this.id },
                body: { direction: 'down' },
            })
            this.confidenceScore = result.confidenceScore
            return success(undefined)
        } catch (err) {
            return failure(convertTuyauError(err, 'POST', `/factoids/${this.id}/vote`) as LinxError)
        }
    }

    /**
     * Report a problem with this factoid.
     * Active reports reduce the factoid's confidence score.
     *
     * @param reason - Category: 'spam' | 'inaccurate' | 'incomplete' | 'defamatory' |
     *   'opinion_not_fact' | 'outdated' | 'duplicate' | 'offensive' | 'misleading' | 'copyright_violation'
     * @param description - Optional free-text explanation (max 2000 chars).
     */
    async report(
        reason: string,
        description?: string,
    ): Promise<LinxResult<unknown>> {
        try {
            const result = await this.api.request('reports.store', {
                params: { id: this.id },
                body: { reason, description },
            } as any)
            return success(result)
        } catch (err) {
            return failure(convertTuyauError(err, 'POST', `/factoids/${this.id}/report`) as LinxError)
        }
    }

    toString(): string {
        return String(this.value)
    }
}
