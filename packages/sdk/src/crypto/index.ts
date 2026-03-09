export type { CryptoAdapter, ProofPayload } from './crypto-adapter.js'
export { createProofPayload, parseProofPayload } from './crypto-adapter.js'
export { WebCryptoAdapter } from './web-crypto-adapter.js'

// NodeCryptoAdapter is NOT statically exported here to avoid bundling
// `node:crypto` in browser/webpack builds. Import it directly:
//   import { NodeCryptoAdapter } from '@linxhq/sdk/crypto/node-crypto-adapter'

/**
 * Auto-detect the environment and return the appropriate crypto adapter.
 * Returns null if no crypto is available.
 *
 * - Browser: uses Web Crypto API (non-extractable private keys)
 * - Node.js / React Native: uses node:crypto via dynamic import
 */
export async function detectCryptoAdapter(): Promise<import('./crypto-adapter.js').CryptoAdapter | null> {
    // Browser with Web Crypto API
    if (typeof globalThis.crypto?.subtle?.generateKey === 'function') {
        const { WebCryptoAdapter } = await import('./web-crypto-adapter.js')
        return new WebCryptoAdapter()
    }

    // Node.js / React Native with node:crypto
    // Use variable to prevent webpack from statically resolving this import
    try {
        if (typeof globalThis.process?.versions?.node === 'string') {
            const modulePath = './node-crypto-adapter.js'
            const mod = await (Function('p', 'return import(p)')(modulePath))
            return new mod.NodeCryptoAdapter()
        }
    } catch {
        // No crypto available
    }

    return null
}
