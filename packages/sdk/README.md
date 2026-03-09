# linx-sdk

TypeScript/JavaScript client for the Linx API. Built on [Tuyau](https://docs.adonisjs.com/guides/frontend/api-client) for end-to-end type-safe API communication — response types are inferred directly from API controller return types, not manually maintained. Provides strongly-typed Schema.org entity access with built-in caching, community voting, factoid mutations, and dirty-tracking batch saves.

## Installation

```bash
npm install linx-sdk
# or
pnpm add linx-sdk
```

## Quick Start

```typescript
import { LinxClient, detectCryptoAdapter } from '@linxhq/sdk'

const client = new LinxClient({
    baseUrl: 'https://api.linx.example.com',
    cryptoAdapter: detectCryptoAdapter(),
})

// Authenticate with an API key (generates DPoP keypair + session token automatically)
const linx = await client.authenticate('oat_abc123...')

// Fetch an entity by ID (resolves 1 level of entity-ref properties by default)
const result = await linx.gasStation('550e8400-e29b-41d4-a716-446655440000')
const station = result.data!

// Access attributes directly
console.log(station.name.current)         // "Membury Services"
console.log(station.name.confidence)      // 0.95

// Mutate a value locally (no network call yet)
station.name.setValue('Membury Service Area')

// Persist all dirty factoids in one batch call
await station.save()

// List entities (subtypes are automatically filtered)
const stations = await linx.serviceStation.list()  // only ServiceStation, not all LocalBusiness

// Create an entity with initial factoids
const newStation = await linx.gasStation.create({
    name: 'New Service Station',
    operator: 'Welcome Break',
})
```

## Client Configuration

```typescript
import { LinxClient, detectCryptoAdapter } from '@linxhq/sdk'

const client = new LinxClient({
    baseUrl: 'https://api.linx.example.com',
    cryptoAdapter: detectCryptoAdapter(),
})
```

| Option          | Type             | Description              |
| --------------- | ---------------- | ------------------------ |
| `baseUrl`       | `string`         | Base URL of the Linx API |
| `cryptoAdapter` | `CryptoAdapter?` | Crypto adapter for DPoP proof-of-possession |

Under the hood, the SDK uses a [Tuyau](https://docs.adonisjs.com/guides/frontend/api-client) client backed by the API's auto-generated route registry. Authentication headers and DPoP proofs are managed automatically.

When a `cryptoAdapter` is configured, `authenticate()` generates an ECDSA P-256 keypair, binds the public key to the server session, and signs every subsequent request. This makes stolen API keys cryptographically useless.

## Type Accessors

Every Schema.org type is available as a camelCase accessor on the client. Each accessor is both a function and an object with `list` and `create` methods.

```typescript
// Fetch a single entity by ID (default depth=1)
const entity = await session.gasStation('uuid')
const hotel = await session.hotel('uuid')
const person = await session.person('uuid')

// Fetch with deeper entity-ref resolution
const station = await session.serviceStation('uuid', { depth: 2 })

// List all entities of a type (subtypes are automatically filtered)
const allStations = await session.serviceStation.list()  // only ServiceStation entities

// List with pagination
const page2 = await session.gasStation.list({ page: 2, perPage: 10 })

// Create a new entity
const created = await session.person.create({
    name: 'John Doe',
    email: 'john@example.com',
})
```

The SDK automatically maps camelCase names to Schema.org types and routes them to the correct API endpoint. For example, `session.gasStation` maps to the `GasStation` Schema.org type and routes to the `/LocalBusiness` API endpoint with `?additionalType=GasStation`. Place subtypes like `park` and `road` route to `/Place`.

## HydratedEntity

Entities returned by the SDK are `HydratedEntity` instances. The API returns a flat `{ entities[], factoids[] }` structure and the SDK assembles it into a typed object graph. Attributes are accessible directly as properties via a JavaScript Proxy.

- **Factoid-type properties** → `RootFactoid<T>`
- **Entity-reference properties** (e.g. `containedInPlace`) → `HydratedEntity[]`

### Property Access

```typescript
const result = await session.gasStation('uuid')
const station = result.data!

// Scalar attributes return a RootFactoid
station.name                  // RootFactoid<string>
station.name.current          // "Membury Services"
station.name.confidence       // 0.95

// Entity-reference attributes return HydratedEntity[] (resolved via depth)
station.containedInPlace      // HydratedEntity[]
station.containedInPlace[0].name.current  // "Motorway Junction 14"
```

### Mutating Values and Saving

```typescript
// Set values locally — no network call
station.name.setValue('New Name')
station.operator.setValue('New Operator')

// Persist all dirty factoids in one atomic batch call
const result = await station.save()
if (result.isError) {
    console.error(result.error)
}
// Entity is re-assembled from the server response after a successful save
```

### Methods

```typescript
// Persist dirty factoids
await station.save()

// Get a specific attribute
const name = station.getAttribute('name')

// Get all attributes
const attrs = station.getAttributes()

// Archive an entity (marks all factoids as not current)
await station.archive()

// String representation (uses name if available)
console.log(`${station}`)  // "Membury Services"
```

### Properties

| Property         | Type                 | Description                          |
| ---------------- | -------------------- | ------------------------------------ |
| `id`             | `string`             | Entity UUID                          |
| `type`           | `string`             | Schema.org root type                 |
| `additionalType` | `string \| null`     | Domain-specific subtype              |

## Factoid & RootFactoid

The SDK uses two factoid classes with an inheritance relationship:

- **`Factoid<T>`** — base class with shared properties (value, confidence, source, voting). Used for suggestion items.
- **`RootFactoid<T>`** — extends `Factoid<T>` with mutation methods (`setValue`, `suggest`, `archive`), the `current` getter, and pre-loaded `suggestions`. Used for top-level entity attributes.

> **Migration note:** `HydratedFactoid` is exported as a deprecated alias for `RootFactoid`.

### Properties (both Factoid and RootFactoid)

| Property          | Type      | Description                      |
| ----------------- | --------- | -------------------------------- |
| `id`              | `string`  | Factoid UUID                     |
| `entityId`        | `string`  | Parent entity UUID               |
| `attribute`       | `string`  | Attribute key                    |
| `value`           | `T`       | Raw value (typed)                |
| `confidence`      | `number`  | Confidence score (0-1)           |
| `confidenceScore` | `number`  | Confidence score (0-1)           |
| `isCurrent`       | `boolean` | Whether this is the active value |
| `source`          | `object`  | Source metadata                  |

### RootFactoid-only Properties

| Property      | Type                            | Description                                      |
| ------------- | ------------------------------- | ------------------------------------------------ |
| `current`     | `T`                             | Alias for `value`                                |
| `suggestions` | `PaginatedCollection<Factoid<T>>` | Pre-loaded alternative values (sync access)     |

### Local Mutation (RootFactoid only)

```typescript
// Set value locally — tracked by the parent entity's dirty state
station.name.setValue('New Name')

// Persist via the parent entity
await station.save()
```

### Voting (both Factoid and RootFactoid)

```typescript
// Upvote — increases confidence (confidence score updated locally)
await station.name.upvote()

// Downvote — decreases confidence (exponential penalty)
await station.name.downvote()

// Vote on a suggestion
await station.name.suggestions[0].upvote()
```

### Suggestions (RootFactoid only)

Suggestions are pre-loaded in the background after entity fetch and accessible synchronously:

```typescript
// Access suggestions synchronously — no async call needed
console.log(station.name.suggestions.length)         // number of alternatives
console.log(station.name.suggestions[0].value)       // typed value
console.log(station.name.suggestions[0].confidence)  // confidence score

// Paginate through suggestions
const nextPage = await station.name.suggestions.nextPage()
const page3 = await station.name.suggestions.requestPage(3)

// Suggest a new alternative value (creates isCurrent: false factoid)
await station.name.suggest('Membury Service Area', {
    notes: 'Official name from highway signage',
})
```

### Archiving (RootFactoid only)

```typescript
// Mark a factoid as no longer current
await station.name.archive()
```

### String Coercion (both)

Both classes support `toString()` for use in templates:

```typescript
const html = `<h1>${station.name}</h1>`  // <h1>Membury Services</h1>
```

## PaginatedCollection

`PaginatedCollection<T>` provides synchronous array-like access with async pagination methods. Used for pre-loaded suggestions and anywhere synchronous collection access with lazy pagination is needed.

```typescript
const suggestions = station.name.suggestions

// Array-like access
suggestions[0].value       // first suggestion
suggestions.length         // count on current page

// Iteration
for (const s of suggestions) {
    console.log(s.value, s.confidence)
}

// Pagination
suggestions.meta           // { total, perPage, currentPage, lastPage, firstPage }
await suggestions.nextPage()
await suggestions.previousPage()
await suggestions.requestPage(3)
```

## Caching

The SDK automatically caches entities by ID. Subsequent requests for the same entity return the cached instance (unless `depth` differs).

```typescript
// First call fetches from API
const a = await client.gasStation('uuid')

// Second call returns cached instance
const b = await client.gasStation('uuid')

// Invalidate a specific entity (also clears dirty state)
client.invalidate('uuid')

// Clear all cached entities
client.clearCache()
```

`entity.save()` automatically refreshes the cached entity from the server response.

## Security & DPoP

The SDK supports **DPoP (Demonstration of Proof of Possession)**, a cryptographic mechanism that binds sessions to the client. When enabled, every request is signed with a client-generated keypair — even if an attacker captures the API key and session token, they cannot produce valid signatures without the private key.

### Crypto Adapters

| Adapter              | Environment            | Private Key Security |
| -------------------- | ---------------------- | -------------------- |
| `WebCryptoAdapter`   | Browser                | Non-extractable — locked in browser crypto subsystem |
| `NodeCryptoAdapter`  | Node.js / React Native | In-process memory (trusted context) |

```typescript
// Auto-detect environment
import { LinxClient, detectCryptoAdapter } from '@linxhq/sdk'
const client = new LinxClient({ baseUrl: '...', cryptoAdapter: detectCryptoAdapter() })

// Explicit browser adapter
import { LinxClient, WebCryptoAdapter } from '@linxhq/sdk'
const client = new LinxClient({ baseUrl: '...', cryptoAdapter: new WebCryptoAdapter() })

// Explicit Node.js / React Native adapter
import { LinxClient, NodeCryptoAdapter } from '@linxhq/sdk'
const client = new LinxClient({ baseUrl: '...', cryptoAdapter: new NodeCryptoAdapter() })
```

Without a `cryptoAdapter`, the SDK operates normally using session tokens but without the cryptographic proof-of-possession layer.

## Integration Example

### React

```typescript
import { LinxClient, detectCryptoAdapter } from '@linxhq/sdk'
import { useEffect, useState } from 'react'

const client = new LinxClient({ baseUrl: '/api', cryptoAdapter: detectCryptoAdapter() })

function StationCard({ id }: { id: string }) {
    const [station, setStation] = useState<Awaited<ReturnType<typeof client.gasStation>> | null>(null)

    useEffect(() => {
        client.gasStation(id).then(setStation)
    }, [id])

    if (!station) return <div>Loading...</div>

    return (
        <div>
            <h2>{station.name.current}</h2>
            <p>Confidence: {station.name.confidence}</p>
            <button onClick={() => station.name.upvote()}>Upvote</button>
            <button onClick={async () => {
                station.name.setValue('New Name')
                await station.save()
            }}>Edit</button>
        </div>
    )
}
```

### Node.js

```typescript
import { LinxClient, NodeCryptoAdapter } from '@linxhq/sdk'

const client = new LinxClient({
    baseUrl: 'http://localhost:3333',
    cryptoAdapter: new NodeCryptoAdapter(),
})

async function main() {
    const linx = await client.authenticate('oat_abc123...')

    // Create a new entity
    const result = await linx.gasStation.create({
        name: 'Test Station',
        operator: 'Shell',
    })
    const station = result.data!
    console.log(`Created: ${station.id}`)

    // Mutate and save
    station.name.setValue('Updated Station')
    await station.save()

    // List all gas stations
    const list = await linx.gasStation.list()
    for (const s of list.data!) {
        console.log(`${s.name.current} (confidence: ${s.name.confidence})`)
    }
}

main()
```

## Activity Logs

The SDK provides access to Linx activity logs — a complete audit trail of every action performed through the API. Requires `read_own_logs` or `read_all_logs` permission.

```typescript
// Query logs with filters
const logs = await session.logs({
    entityId: 'some-entity-id',
    action: 'factoid.created',
})

if (logs.isSuccess) {
    for (const entry of logs.data!) {
        console.log(entry.action)      // 'factoid.created'
        console.log(entry.metadata)    // { attribute: 'name', value: 'Shell' }
        console.log(entry.requestId)   // trace all actions from one request
    }

    // Paginate
    const nextPage = await logs.nextPage()
    const page5 = await logs.requestPage(5)
}
```

### Available Filters

| Filter      | Type     | Description |
| ----------- | -------- | ----------- |
| `action`    | `string` | Filter by action (e.g., `factoid.created`) |
| `category`  | `string` | Filter by category (e.g., `factoid`, `auth`) |
| `entityId`  | `string` | Filter by related Entity |
| `factoidId` | `string` | Filter by related Factoid |
| `level`     | `string` | Filter by level (`info`, `warn`, `error`) |
| `page`      | `number` | Page number (default: 1) |
| `perPage`   | `number` | Results per page (default: 20) |
