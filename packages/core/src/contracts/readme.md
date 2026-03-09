# .contract.ts files
Linx uses contracts as a single source of truth across its packages. We extrapolate database schemas and SDK implementations using contracts to ensure that they always stay in line with one-another.

Schemas and contract code must remain separate in their respective directories.

## Schema Philosophy

Our schemas follow a **build-up composition** pattern:

- **Generic schemas** (`Entity`, `Factoid`, `Source`, `Vote`, etc.) define what something IS — they are generic, unopinionated, and reusable (like schema.org schemas). These serve directly as **input schemas** — no pick/omit/extend needed.
- **Linx schemas** (`LinxEntity`, `LinxFactoid`, `LinxSource`, `LinxVote`, etc.) compose upward from generic schemas by adding system-managed fields (id, timestamps, foreign keys, confidence). These represent how Linx stores and tracks data.

Adding a user-facing field → add to the generic schema → flows to both input and Linx variant.
Adding a system field → add to the Linx variant only → input is unaffected.

## Contract Template Example
All contracts must follow the same template and documentation procedures:

```ts [title].contract.ts
import type { Contract } from 'src/types';
import type { Infer } from '@vinejs/vine/types';
import {
  <Title> as <Title>InputSchema,
  Linx<Title> as Linx<Title>Schema,
} from 'src/schemas/<title>';

export default interface <Title> extends Contract {
  /**
   * The Linx stored representation schema (with system fields).
   */
  Schema: typeof Linx<Title>Schema;

  /**
   * Full data type (as stored by Linx).
   */
  Data: <Title>Data;

  /**
   * Input type — inferred directly from the generic schema.
   * No Omit needed: the generic schema IS the input.
   */
  Input: <Title>Input;

  /**
   * The hydrated data structure with base SDK methods (shared by all instances including suggestions).
   */
  Hydrated: <Title>Data & <Title>Hydrations;

  /**
   * (Optional) The root-level hydrated structure with additional methods
   * only available on top-level instances (not suggestions/children).
   * Used when a type has two hydration levels (e.g., Factoid vs RootFactoid).
   */
  RootHydrated?: <Title>Data & <Title>Hydrations & Root<Title>Hydrations;
}

/**
 * Full stored data, inferred from the Linx schema variant.
 */
type <Title>Data = Infer<typeof Linx<Title>Schema>;

/**
 * Input data, inferred from the generic schema.
 * The generic schema only contains user-provided fields — no system fields to omit.
 */
type <Title>Input = Infer<typeof <Title>InputSchema>;

/**
 * Represents the set of methods and properties used to hydrate and interact with a <Title>.
 */
type <Title>Hydrations = {
    /**
     * Signatures for additional methods/statics created by the SDK after
     * it has received data from the API.
     * Each signature must have a JSDoc docstring description above it.
     */
}
```
