# Linx

Linx is a Schema.org-based universal metadata database. It stores structured data about real-world things — places, people, organisations — as **Entities** made up of individually votable **Factoids**, each carrying a confidence score and source provenance.

Traditional databases store records as flat rows. Linx separates **what something is** from **what we know about it**:

- An **Entity** is just an identity — a UUID and a Schema.org type. It holds no data of its own.
- A **Factoid** is a single claim about that entity — "the name is Membury Services", "it opens at 06:00 on Mondays". Each factoid carries a confidence score, tracks whether it's the current accepted value, and can be individually voted on.
- A **Source** records where a factoid came from — an API import, a user submission, a verified business owner.

Multiple factoids can exist for the same attribute. Two sources might disagree on a name — both coexist, each with their own confidence score. The system surfaces the most trusted value based on community consensus, but competing claims are never lost.

## Repository Structure

This is the **public** Linx repository containing the packages published to npm. The API server, documentation site, and other internal tooling live in a separate private repository.

```
linx/
├── packages/
│   ├── core/    # @linxhq/core — schemas, types, and contracts
│   └── sdk/     # @linxhq/sdk  — TypeScript client library
```

### @linxhq/core

Shared data schemas, types, and contracts for the Linx ecosystem. Built on [VineJS](https://vinejs.dev/) for runtime validation and type inference. This package is the **single source of truth** for all data definitions used across the API and SDK.

Core follows a build-up composition pattern: **generic schemas** define what something IS (reusable like Schema.org), while **Linx schemas** compose upward by adding system-managed fields (id, timestamps, confidence). See the [core README](packages/core/README.md) for details.

### @linxhq/sdk

TypeScript/JavaScript client for the Linx API. Built on [Tuyau](https://docs.adonisjs.com/guides/frontend/api-client) for end-to-end type-safe API communication. Provides strongly-typed Schema.org entity access with built-in caching, community voting, factoid mutations, and dirty-tracking batch saves.

See the [SDK README](packages/sdk/README.md) for the full API reference.

## Quick Start

```bash
npm install @linxhq/sdk
```

```typescript
import { LinxClient, detectCryptoAdapter } from '@linxhq/sdk'

// Create and authenticate a client
const client = new LinxClient({
  baseUrl: 'https://api.linx.example.com',
  cryptoAdapter: detectCryptoAdapter(),
})
const linx = await client.authenticate('oat_your-api-key')

// Fetch an entity
const result = await linx.gasStation('some-uuid')
const station = result.data!

// Read factoid attributes
console.log(station.name.current)     // "Membury Services"
console.log(station.name.confidence)  // 0.95

// Mutate and save
station.name.setValue('Membury Service Area')
await station.save()

// Vote on accuracy
await station.name.upvote()

// Suggest an alternative value
await station.name.suggest('Membury Services', {
  notes: 'Official highway signage',
})

// List entities (subtypes are automatically filtered)
const stations = await linx.serviceStation.list()

// Create an entity
const newStation = await linx.gasStation.create({
  name: 'New Service Station',
  operator: 'Welcome Break',
})
```

### User-Scoped Sessions

Applications authenticate once, then optionally layer user identity for attribution:

```typescript
// App-only mode — reads and writes attributed to the application
const linx = await client.authenticate('oat_your-api-key')

// User-scoped mode — actions attributed to both the app and user
const session = linx.as('user-account-id')
await session.gasStation('uuid')

// Return to app-only mode
const appOnly = session.as()
```

## Key Features

- **Type-safe Schema.org access** — every Schema.org type available as a camelCase accessor (`session.gasStation`, `session.hotel`, `session.person`)
- **Community voting** — upvote/downvote factoids to shift confidence scores
- **Suggestions** — propose alternative values without overwriting existing data
- **Dirty tracking** — mutate values locally, then batch-save only what changed
- **DPoP security** — optional cryptographic proof-of-possession binds sessions to the client
- **Automatic caching** — entities cached by ID with invalidation support
- **Ownership & verification** — claim entities and verify factoids for confidence boosts
- **Activity logs** — full audit trail of every action through the API
- **Reports** — flag inaccurate, outdated, or inappropriate content

## License

Copyright (c) 2026 Linx HQ. All rights reserved. See **Linx Proprietary License** at LICENSE file.
