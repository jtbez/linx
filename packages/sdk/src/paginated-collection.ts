import type { PaginationMeta } from './result.js'

export type PageFetcher<T> = (page: number) => Promise<PaginatedCollection<T>>

/**
 * A synchronous collection wrapper with async pagination methods.
 *
 * Provides array-like indexed access via Proxy, so `collection[0]`
 * works directly. Pagination methods (nextPage, previousPage, requestPage)
 * fetch additional pages from the API.
 *
 * Used for pre-loaded suggestions on RootFactoid and anywhere
 * synchronous collection access with lazy pagination is needed.
 */
class PaginatedCollectionImpl<T> {
    data: T[]
    meta: PaginationMeta | null
    private fetchPage: PageFetcher<T> | null

    constructor(
        data: T[] = [],
        meta: PaginationMeta | null = null,
        fetchPage: PageFetcher<T> | null = null,
    ) {
        this.data = data
        this.meta = meta
        this.fetchPage = fetchPage

        return new Proxy(this, {
            get(target, prop, receiver) {
                // Numeric index access → forward to data array
                if (typeof prop === 'string' && /^\d+$/.test(prop)) {
                    return target.data[Number(prop)]
                }
                return Reflect.get(target, prop, receiver)
            },
        })
    }

    get length(): number {
        return this.data.length
    }

    nextPage(): Promise<PaginatedCollection<T>> | null {
        if (!this.meta || !this.fetchPage || this.meta.currentPage >= this.meta.lastPage) {
            return null
        }
        return this.fetchPage(this.meta.currentPage + 1)
    }

    previousPage(): Promise<PaginatedCollection<T>> | null {
        if (!this.meta || !this.fetchPage || this.meta.currentPage <= this.meta.firstPage) {
            return null
        }
        return this.fetchPage(this.meta.currentPage - 1)
    }

    requestPage(page: number): Promise<PaginatedCollection<T>> | null {
        if (!this.fetchPage) return null
        return this.fetchPage(page)
    }

    /** Support for-of iteration */
    [Symbol.iterator](): Iterator<T> {
        return this.data[Symbol.iterator]()
    }
}

/**
 * Public type for PaginatedCollection with indexed access.
 */
export type PaginatedCollection<T> = PaginatedCollectionImpl<T> & {
    readonly [index: number]: T
}

export const PaginatedCollection = PaginatedCollectionImpl as unknown as {
    new <T>(
        data?: T[],
        meta?: PaginationMeta | null,
        fetchPage?: PageFetcher<T> | null,
    ): PaginatedCollection<T>
}
