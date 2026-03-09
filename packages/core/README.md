# linx-core

Shared data schemas, types, and contracts for the Linx ecosystem. Built on [VineJS](https://vinejs.dev/) for runtime validation and type inference. This package is the single source of truth for all data definitions used across the API and SDK.

## Installation

```bash
npm install linx-core
# or
pnpm add linx-core
```

## Schema Philosophy

linx-core follows a **build-up composition** pattern with two layers of schemas:

**Generic schemas** (`Entity`, `Factoid`, `Source`, `Vote`, `UserAccount`, `SoftwareApplication`) define what something IS — generic, unopinionated, and reusable like schema.org schemas. These serve directly as **input schemas** for SDK and API operations. No pick/omit/extend needed.

**Linx schemas** (`LinxEntity`, `LinxFactoid`, `LinxSource`, `LinxVote`, `LinxUserAccount`, `LinxSoftwareApplication`) compose upward from generic schemas by adding system-managed fields (id, timestamps, foreign keys, confidence). These represent how Linx stores and tracks data.

Schema composition uses VineJS's `getProperties()` spread pattern:

```
Source         "what a source IS"          → { ref?, notes? }
LinxSource     "how Linx tracks a source"  → Source + { id, type, userAccountId?, applicationId?, createdAt, updatedAt }

Entity         "what an entity IS"         → { type, additionalType? }
LinxEntity     "how Linx stores an entity" → Entity + { id, createdAt, updatedAt }

Factoid        "what a factoid IS"         → { attribute, value, source: Source }
LinxFactoid    "how Linx stores a factoid" → Factoid + { id, entityId, confidence, isCurrent, source: LinxSource, createdAt, updatedAt }
```

- **Adding a user-facing field:** Add to the generic schema → flows to both input and Linx variant.
- **Adding a system field:** Add to the Linx variant only → input is unaffected.
- **Composing schemas:** Use `vine.object({ ...Base.getProperties(), ...Extra.getProperties() })`.
- **Omitting fields:** Destructure: `const { fieldToOmit, ...rest } = Schema.getProperties()`.

## Schemas

All schemas are VineJS objects. The API validates incoming requests using `request.validateUsing(vine.compile(Schema))`. Type inference uses `Infer<typeof Schema>` from `@vinejs/vine/types`.

### Entity (Generic — Input)

```typescript
import { Entity } from '@linxhq/core'

// Entity.getProperties() → { type, additionalType }
```

| Field            | Type                | Description                           |
| ---------------- | ------------------- | ------------------------------------- |
| `type`           | `Schema.org enum`   | Root type (Place, Person, etc.)       |
| `additionalType` | `string` (optional) | Domain subtype (e.g. "ServiceStation") |

### LinxEntity (Stored Representation)

Extends `Entity` with system-managed fields via `LinxSystemFields`.

| Field       | Type   | Description           |
| ----------- | ------ | --------------------- |
| `id`        | `UUID` | Unique identifier     |
| `createdAt` | `Date` | Creation timestamp    |
| `updatedAt` | `Date` | Last update timestamp |

### Factoid (Generic — Input)

```typescript
import { Factoid } from '@linxhq/core'

// Factoid.getProperties() → { attribute, value, source }
```

| Field       | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `attribute` | `string` | Property name (e.g. "name")          |
| `value`     | `any`    | The factoid's value                  |
| `source`    | `Source` | Optional provenance info (ref, notes)|

### Source (Generic — Input)

```typescript
import { Source } from '@linxhq/core'

// Source.getProperties() → { ref, notes }
```

| Field   | Type                | Description            |
| ------- | ------------------- | ---------------------- |
| `ref`   | `string` (optional) | External reference ID  |
| `notes` | `string` (optional) | Additional context     |

### EntityWithAttributes (Composite Input)

Batch creation: an entity plus its initial factoid attributes.

```typescript
import { EntityWithAttributes } from '@linxhq/core'

// Combines Entity properties with an array of Factoid attributes
```

## Response Formats

The API uses **AdonisJS HTTP Transformers** to shape responses. The `EntityTransformer` defines two output formats:

- **Standard** (`toObject()`) — flat JSON-LD style, factoid values as top-level keys
- **Enriched** (`forDetailView()`) — includes factoid metadata (id, value, confidence) for SDK hydration

Response types are inferred by **Tuyau** from the Transformer output, providing end-to-end type safety from API to SDK without manual wire format definitions.

## Database Schema Helpers

Convert schemas with nested objects to flat database representations using foreign keys.

```typescript
import { FactoidDb, toDbSchema } from '@linxhq/core'

// FactoidDb replaces the nested `source` object with a `sourceId` UUID field
// Schemas with no nested objects (Entity, Vote, Source, Permission) use their
// Linx/generic schemas directly — no *Db variant needed.
```

## Types

### Contract

Generic interface for defining API contracts with schema, data, input, and hydrated types. Input is inferred directly from the generic schema — no `Omit` or `InputOmitters` needed.

```typescript
import type { Contract } from '@linxhq/core'
```

### SchemaTypeMap

Maps camelCase accessors to their Schema.org property types. Used by the SDK for type-safe entity access.

```typescript
import type { SchemaTypeMap } from '@linxhq/core'

// SchemaTypeMap['gasStation'] → GasStation properties
// SchemaTypeMap['hotel'] → Hotel properties
```

## Domain Schemas

### ServiceStation

Schema and constants for service station entities with amenity support.

```typescript
import {
    ServiceStation,
    SERVICE_STATION_AMENITY_KEYS,
    OSM_ENTITY_MAP,
    OSM_AMENITY_MAP,
} from '@linxhq/core'
```

## Contracts

Type-level contracts for Entity, Factoid, UserAccount, and SoftwareApplication.

```typescript
import type { EntityContract, FactoidContract, UserAccountContract, SoftwareApplicationContract } from '@linxhq/core'

// Each contract defines:
// - Schema: the Linx stored representation schema (VineJS)
// - Data: Infer<typeof LinxSchema> (full stored type)
// - Input: Infer<typeof GenericSchema> (user input — no omit needed)
// - Hydrated: Data + SDK methods
```
