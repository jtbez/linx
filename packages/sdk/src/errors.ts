/**
 * Base error class for all Linx SDK errors.
 * Carries the HTTP status code and parsed error details from the API response.
 */
export class LinxError extends Error {
    readonly status: number
    readonly code: string
    readonly path: string
    readonly details?: Record<string, string[]>

    constructor(
        status: number,
        code: string,
        message: string,
        path: string,
        details?: Record<string, string[]>,
    ) {
        super(message)
        this.name = 'LinxError'
        this.status = status
        this.code = code
        this.path = path
        this.details = details
    }
}

/** 422 — Validation errors from the API */
export class ValidationError extends LinxError {
    constructor(message: string, path: string, details?: Record<string, string[]>) {
        super(422, 'VALIDATION_ERROR', message, path, details)
        this.name = 'ValidationError'
    }
}

/** 404 — Entity or factoid not found */
export class NotFoundError extends LinxError {
    constructor(message: string, path: string) {
        super(404, 'NOT_FOUND', message, path)
        this.name = 'NotFoundError'
    }
}

/** 403 — Insufficient permissions */
export class PermissionError extends LinxError {
    constructor(message: string, path: string = '') {
        super(403, 'PERMISSION_DENIED', message, path)
        this.name = 'PermissionError'
    }
}

/** 401 — Authentication required or invalid */
export class AuthenticationError extends LinxError {
    constructor(message: string, path: string) {
        super(401, 'AUTHENTICATION_ERROR', message, path)
        this.name = 'AuthenticationError'
    }
}

/** 429 — Rate limited */
export class RateLimitError extends LinxError {
    constructor(message: string, path: string) {
        super(429, 'RATE_LIMITED', message, path)
        this.name = 'RateLimitError'
    }
}

/** API↔SDK schema mismatch — response doesn't match expected wire format */
export class ContractError extends LinxError {
    readonly zodErrors: unknown

    constructor(message: string, path: string, zodErrors?: unknown) {
        super(500, 'CONTRACT_ERROR', message, path)
        this.name = 'ContractError'
        this.zodErrors = zodErrors
    }
}

/** 5xx — Server-side error */
export class ServerError extends LinxError {
    constructor(message: string, path: string) {
        super(500, 'SERVER_ERROR', message, path)
        this.name = 'ServerError'
    }
}

/**
 * Creates the appropriate typed error from an HTTP response status and body.
 */
export function createLinxError(
    status: number,
    body: Record<string, unknown>,
    method: string,
    path: string,
): LinxError {
    const message = typeof body.message === 'string'
        ? body.message
        : `${method} ${path} failed: ${status}`

    const details = body.errors as Record<string, string[]> | undefined

    switch (status) {
        case 401:
            return new AuthenticationError(message, path)
        case 403:
            return new PermissionError(message, path)
        case 404:
            return new NotFoundError(message, path)
        case 422:
            return new ValidationError(message, path, details)
        case 429:
            return new RateLimitError(message, path)
        default:
            if (status >= 500) {
                return new ServerError(message, path)
            }
            return new LinxError(status, 'REQUEST_FAILED', message, path, details)
    }
}
