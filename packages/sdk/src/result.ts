/** Pagination metadata returned by the API */
export interface PaginationMeta {
    readonly total: number
    readonly perPage: number
    readonly currentPage: number
    readonly lastPage: number
    readonly firstPage: number
}

/**
 * Result for paginated list queries.
 * Includes pagination metadata and helpers to fetch adjacent pages.
 */
export interface PaginatedResult<T> {
    readonly data: T[]
    readonly meta: PaginationMeta
    /** Fetch the next page, or null if on the last page */
    nextPage(): Promise<PaginatedResult<T>> | null
    /** Fetch the previous page, or null if on the first page */
    previousPage(): Promise<PaginatedResult<T>> | null
    /** Fetch a specific page by number */
    requestPage(page: number): Promise<PaginatedResult<T>>
}

/** Create a successful PaginatedResult */
export function paginatedSuccess<T>(
    data: T[],
    meta: PaginationMeta,
    fetchPage: (page: number) => Promise<PaginatedResult<T>>,
): PaginatedResult<T> {
    return {
        data,
        meta,
        nextPage() {
            if (meta.currentPage >= meta.lastPage) return null
            return fetchPage(meta.currentPage + 1)
        },
        previousPage() {
            if (meta.currentPage <= meta.firstPage) return null
            return fetchPage(meta.currentPage - 1)
        },
        requestPage(page: number) {
            return fetchPage(page)
        },
    }
}
