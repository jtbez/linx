import type { Contract } from "../types/index.js";
import type { Infer } from '@vinejs/vine/types';
import { Factoid as FactoidInputSchema, LinxFactoid as LinxFactoidSchema } from "../schemas/factoid/index.js";
import type { Source } from "../types/factoid/index.js";

export default interface FactoidContract extends Contract {
  /**
   * The Linx stored representation schema (with system fields).
   */
  Schema: typeof LinxFactoidSchema;

  /**
   * Full factoid data type (as stored by Linx).
   */
  Data: FactoidData;

  /**
   * Input type — inferred directly from the generic Factoid schema.
   * No Omit needed: the generic schema IS the input.
   */
  Input: FactoidInput;

  /**
   * Base factoid data with shared methods (used for suggestions).
   */
  Hydrated: FactoidData & FactoidHydrations;

  /**
   * Root factoid data with additional methods for top-level entity attributes.
   */
  RootHydrated: FactoidData & FactoidHydrations & RootFactoidHydrations;
}

/**
 * Full stored data, inferred from the LinxFactoid schema.
 */
type FactoidData = Infer<typeof LinxFactoidSchema>;

/**
 * Input data, inferred from the generic Factoid schema.
 * The generic schema only contains user-provided fields — no system fields to omit.
 */
type FactoidInput = Infer<typeof FactoidInputSchema>;

/**
 * Base hydration methods shared by all factoids, including suggestions.
 */
type FactoidHydrations = {
  /**
   * The confidence score associated with the Factoid.
   */
  confidence: number;

  /**
   * The source from which the Factoid was derived.
   */
  source: Source;

  /**
   * Upvotes the Factoid, increasing its confidence or ranking.
   */
  upvote: () => Promise<void>;

  /**
   * Downvotes the Factoid, decreasing its confidence or ranking.
   */
  downvote: () => Promise<void>;

  /**
   * Returns a string representation of the Factoid.
   */
  toString: () => string;
}

/**
 * Additional hydration methods only available on root-level entity attribute factoids.
 * These are NOT available on suggestion factoids.
 */
type RootFactoidHydrations = {
  /**
   * The current value of the Factoid (alias for value).
   */
  current: any;

  /**
   * Sets the value locally and marks the factoid as dirty.
   */
  setValue: (value: any) => void;

  /**
   * Suggests a new value for the Factoid from a given source.
   *
   * @param value - The suggested value.
   * @param source - The source of the suggestion.
   */
  suggest: (value: any, source: Source) => Promise<FactoidContract["Data"]>;

  /**
   * Pre-loaded suggestions for this factoid attribute.
   * Populated automatically in the background after entity load.
   */
  suggestions: unknown;

  /**
   * Archives the Factoid, marking it as inactive or historical.
   */
  archive: () => Promise<void>;
}
