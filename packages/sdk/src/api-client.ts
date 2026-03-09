import { createTuyau, TuyauHTTPError, TuyauNetworkError } from '@tuyau/core/client'
import { registry } from '@linxhq/api/registry'
import { createLinxError, LinxError, ServerError } from './errors.js'
import type { CryptoAdapter } from './crypto/crypto-adapter.js'
import { createProofPayload } from './crypto/crypto-adapter.js'

// Type helper — never called, exists only for type extraction
function _createClient() {
    return createTuyau({ baseUrl: '', registry })
}

export type ApiClient = ReturnType<typeof _createClient>

export interface ApiClientConfig {
    baseUrl: string
    cryptoAdapter?: CryptoAdapter
}

/**
 * Cross-environment SHA-256 hash, returned as base64url.
 * Uses Web Crypto API (browser) or node:crypto (Node.js/RN).
 */
async function sha256(input: string): Promise<string> {
    if (typeof globalThis.crypto?.subtle?.digest === 'function') {
        const encoded = new TextEncoder().encode(input)
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded)
        const bytes = new Uint8Array(hashBuffer)
        const binary = String.fromCharCode(...bytes)
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    const { createHash } = await import(/* webpackIgnore: true */ 'node:crypto')
    return createHash('sha256').update(input).digest('base64url')
}

/**
 * Creates a Tuyau-backed API client with mutable auth token support
 * and optional DPoP proof-of-possession signing.
 *
 * The Tuyau client provides type-safe RPC-like access to every API route:
 *   api.request('entities.show', { params: { type: 'Place', id } })
 *   api.request('factoids.vote', { params: { id }, body: { direction: 'up' } })
 *
 * Response types are inferred directly from the API's controller return types
 * and VineJS validators — no manual type duplication needed.
 */
export function createApiClient(config: ApiClientConfig) {
    let authToken: string | undefined
    let cryptoAdapter: CryptoAdapter | undefined = config.cryptoAdapter
    let privateKey: unknown | undefined
    let publicKeyJwk: JsonWebKey | undefined

    const client = createTuyau({
        baseUrl: config.baseUrl,
        registry,
        hooks: {
            beforeRequest: [
                async (request) => {
                    request.headers.set('Content-Type', 'application/json')
                    if (authToken) {
                        request.headers.set('Authorization', `Bearer ${authToken}`)
                    }

                    // Sign request with DPoP proof if keypair is bound
                    if (cryptoAdapter && privateKey && authToken) {
                        try {
                            const url = new URL(request.url)
                            const tokenHash = await sha256(authToken)
                            const payload = createProofPayload(
                                request.method,
                                url.pathname + url.search,
                                tokenHash,
                            )
                            const signature = await cryptoAdapter.sign(privateKey, payload)
                            request.headers.set('X-DPoP-Proof', signature)
                            request.headers.set('X-DPoP-Payload', payload)
                        } catch {
                            // DPoP signing failed — continue without proof
                            // Server will reject if requireDpop is true
                        }
                    }
                },
            ],
        },
    })

    return {
        client,
        setToken(token: string) {
            authToken = token
        },
        /**
         * Generate a new keypair using the configured crypto adapter.
         * Returns the public key JWK for registration with the server.
         * Returns null if no crypto adapter is configured.
         */
        async generateKeyPair(): Promise<JsonWebKey | null> {
            if (!cryptoAdapter) return null
            const keyPair = await cryptoAdapter.generateKeyPair()
            publicKeyJwk = keyPair.publicKey
            privateKey = keyPair.privateKey
            return publicKeyJwk
        },
        /** Get the current public key JWK, if a keypair has been generated. */
        getPublicKey(): JsonWebKey | undefined {
            return publicKeyJwk
        },
        /** Clear the bound keypair (e.g. on session expiry). */
        clearKeyPair() {
            privateKey = undefined
            publicKeyJwk = undefined
        },
    }
}

/**
 * Converts a Tuyau error into the SDK's LinxError hierarchy.
 */
export function convertTuyauError(err: unknown, method = 'UNKNOWN', path = ''): LinxError {
    if (err instanceof TuyauHTTPError) {
        const body = err.response ?? {}
        return createLinxError(err.status ?? 500, body, method, path)
    }
    if (err instanceof TuyauNetworkError) {
        return new ServerError(err.message, path)
    }
    if (err instanceof LinxError) {
        return err
    }
    return new ServerError(
        err instanceof Error ? err.message : 'Unknown error',
        path,
    )
}
