import type { CryptoAdapter } from './crypto-adapter.js'

/**
 * Node.js / React Native crypto adapter.
 *
 * Uses the `node:crypto` module for key generation and signing.
 * Also works in React Native with polyfills like `react-native-quick-crypto`.
 *
 * Unlike the Web Crypto adapter, the private key IS extractable (it's a
 * regular JS object in memory). However:
 * - In Node.js, this is a trusted server-to-server context
 * - In React Native, the key is inside a compiled app bundle, making it
 *   significantly harder to extract than from browser dev tools
 */
export class NodeCryptoAdapter implements CryptoAdapter {
    async generateKeyPair() {
        const { generateKeyPairSync, createSign } = await import('node:crypto')

        const { publicKey, privateKey } = generateKeyPairSync('ec', {
            namedCurve: 'prime256v1', // P-256
        })

        const publicKeyJwk = publicKey.export({ format: 'jwk' })

        return {
            publicKey: publicKeyJwk as JsonWebKey,
            privateKey,
        }
    }

    async sign(privateKey: unknown, payload: string): Promise<string> {
        const { createSign } = await import('node:crypto')
        const signer = createSign('SHA256')
        signer.update(payload)
        signer.end()

        const signature = signer.sign(privateKey as any)
        return base64url(signature)
    }
}

function base64url(buffer: Buffer): string {
    return buffer.toString('base64url')
}
