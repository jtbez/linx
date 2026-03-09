import type { CryptoAdapter } from './crypto-adapter.js'

/**
 * Browser Web Crypto API adapter.
 *
 * Uses `extractable: false` so the private key is locked inside the browser's
 * crypto subsystem — it literally cannot be read by JavaScript. This provides
 * the strongest possible protection for browser-based clients.
 */
export class WebCryptoAdapter implements CryptoAdapter {
    async generateKeyPair() {
        const keyPair = await crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' },
            false, // non-extractable private key
            ['sign'],
        )

        const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

        return {
            publicKey,
            privateKey: keyPair.privateKey,
        }
    }

    async sign(privateKey: unknown, payload: string): Promise<string> {
        const key = privateKey as CryptoKey
        const encoded = new TextEncoder().encode(payload)

        const signature = await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            key,
            encoded,
        )

        return base64url(new Uint8Array(signature))
    }
}

function base64url(bytes: Uint8Array): string {
    const binary = String.fromCharCode(...bytes)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
