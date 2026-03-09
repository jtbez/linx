/**
 * Post-build step: bundles the Tuyau route registry into the SDK build output
 * so consumers don't need @linxhq/api (a private package) at runtime.
 *
 * 1. Copies the registry from @linxhq/api into build/generated/registry.js
 *    (stripping TypeScript-only constructs to produce valid JS)
 * 2. Rewrites the import in build/api-client.js to use the local copy
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sdkRoot = resolve(__dirname, '..')
const buildDir = resolve(sdkRoot, 'build')

// --- Step 1: Generate a standalone registry.js in build/generated/ ---

const registrySrc = resolve(sdkRoot, '..', '..', '..', 'linx-private', 'apps', 'api', '.adonisjs', 'client', 'registry', 'index.ts')
const outDir = resolve(buildDir, 'generated')
mkdirSync(outDir, { recursive: true })

const source = readFileSync(registrySrc, 'utf-8')

// Strip TypeScript type-only constructs to produce valid JS
const transformed = source
  // Remove all `import type ...` lines
  .replace(/^import type .*$/gm, '')
  // Remove `as Registry['...']['types']` casts
  .replace(/ as Registry\[.*?\]\['types'\]/g, '')
  // Remove `as ApiDefinition` cast
  .replace(/ as ApiDefinition/g, '')
  // Remove `as const satisfies Record<string, AdonisEndpoint>`
  .replace(/ as const satisfies Record<string, AdonisEndpoint>/g, '')
  // Remove `declare module` augmentation block
  .replace(/declare module '@tuyau\/core\/types' \{[\s\S]*?\n\}/m, '')
  // Remove eslint-disable comment
  .replace(/\/\* eslint-disable prettier\/prettier \*\/\n?/, '')
  // Remove TypeScript type annotations (`: any`, `: any | undefined`, etc.)
  .replace(/: any/g, '')
  // Remove remaining `as any` casts
  .replace(/ as any/g, '')

const header = `// AUTO-GENERATED — do not edit. Produced by scripts/sync-registry.js\n`
writeFileSync(resolve(outDir, 'registry.js'), header + transformed, 'utf-8')

// --- Step 2: Rewrite the import in build/api-client.js ---

const apiClientPath = resolve(buildDir, 'api-client.js')
const apiClientSrc = readFileSync(apiClientPath, 'utf-8')

const rewritten = apiClientSrc.replace(
  /from ['"]@linxhq\/api\/registry['"]/,
  "from './generated/registry.js'"
)

if (rewritten === apiClientSrc) {
  console.error('⚠ Could not find @linxhq/api/registry import in build/api-client.js')
  process.exit(1)
}

writeFileSync(apiClientPath, rewritten, 'utf-8')

console.log('✓ Registry bundled into build/generated/registry.js')
console.log('✓ build/api-client.js rewritten to use local registry')
