import type { LinxError } from './errors.js'

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Wraps every SDK response with status, data, and error information.
 * Developers can check `.isSuccess` / `.isError` without try/catch.
 */
export interface LinxResult<T> {
    readonly data: T | null
    readonly error: LinxError | null
    readonly status: RequestStatus
    readonly isLoading: boolean
    readonly isError: boolean
    readonly isSuccess: boolean
}

/** Pagination metadata returned by the API */
export interface PaginationMeta {
    readonly total: number
    readonly perPage: number
    readonly currentPage: number
    readonly lastPage: number
    readonly firstPage: number
}

/**
 * Extended result for paginated list queries.
 * Includes pagination metadata and helpers to fetch adjacent pages.
 */
export interface PaginatedResult<T> extends LinxResult<T[]> {
    readonly meta: PaginationMeta | null
    /** Fetch the next page, or null if on the last page */
    nextPage(): Promise<PaginatedResult<T>> | null
    /** Fetch the previous page, or null if on the first page */
    previousPage(): Promise<PaginatedResult<T>> | null
    /** Fetch a specific page by number */
    requestPage(page: number): Promise<PaginatedResult<T>>
}

/** Create a successful LinxResult */
export function success<T>(data: T): LinxResult<T> {
    return {
        data,
        error: null,
        status: 'success',
        isLoading: false,
        isError: false,
        isSuccess: true,
    }
}

/** Create a failed LinxResult */
export function failure<T>(error: LinxError): LinxResult<T> {
    return {
        data: null,
        error,
        status: 'error',
        isLoading: false,
        isError: true,
        isSuccess: false,
    }
}

/** Create a successful PaginatedResult */
export function paginatedSuccess<T>(
    data: T[],
    meta: PaginationMeta,
    fetchPage: (page: number) => Promise<PaginatedResult<T>>,
): PaginatedResult<T> {
    return {
        data,
        error: null,
        status: 'success',
        isLoading: false,
        isError: false,
        isSuccess: true,
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

/** Create a failed PaginatedResult */
export function paginatedFailure<T>(error: LinxError): PaginatedResult<T> {
    return {
        data: null,
        error,
        status: 'error',
        isLoading: false,
        isError: true,
        isSuccess: false,
        meta: null,
        nextPage() { return null },
        previousPage() { return null },
        requestPage() { return Promise.resolve(paginatedFailure<T>(error)) },
    }
}
