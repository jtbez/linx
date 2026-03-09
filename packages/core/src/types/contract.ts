/**
 * Represents a generic contract with schema, data, input, and hydrated types.
 *
 * With the build-up composition pattern, Input is inferred directly from the
 * generic schema (e.g., Entity, Factoid) and Data from the Linx variant
 * (e.g., LinxEntity, LinxFactoid). No Omit/Pick needed — the generic schema
 * IS the input.
 */
export interface Contract {
    /**
     * The Linx stored representation schema (with system fields).
     */
    Schema: unknown;

    /**
     * The full data structure (as stored by Linx).
     */
    Data: unknown;

    /**
     * The hydrated data structure with SDK methods.
     */
    Hydrated: unknown;

    /**
     * The input shape — inferred from the generic schema.
     */
    Input: unknown;
}
