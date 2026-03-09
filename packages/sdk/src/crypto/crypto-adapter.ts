/**
 * Environment-agnostic crypto adapter interface for DPoP proof-of-possession.
 *
 * Each environment (browser, React Native, Node.js) provides its own
 * implementation using the available crypto primitives.
 */
export interface CryptoAdapter {
    /**
     * Generate an ECDSA P-256 keypair.
     * Returns the public key as JWK (for server registration) and an opaque
     * private key handle (never leaves the client).
     */
    generateKeyPair(): Promise<{
        publicKey: JsonWebKey
        privateKey: unknown
    }>

    /**
     * Sign a UTF-8 payload string with the private key.
     * Returns the signature as a base64url-encoded string.
     */
    sign(privateKey: unknown, payload: string): Promise<string>
}

/**
 * Creates a DPoP proof payload for a given request.
 * The caller signs this payload with their private key.
 */
export function createProofPayload(
    method: string,
    path: string,
    sessionTokenHash: string,
    bodyHash?: string,
): string {
    return JSON.stringify({
        method,
        path,
        timestamp: Math.floor(Date.now() / 1000),
        ath: sessionTokenHash,
        ...(bodyHash ? { bodyHash } : {}),
    })
}

/**
 * Parses a DPoP proof payload.
 */
export interface ProofPayload {
    method: string
    path: string
    timestamp: number
    ath: string
    bodyHash?: string
}

export function parseProofPayload(payload: string): ProofPayload {
    return JSON.parse(payload)
}
