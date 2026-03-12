import type { Contract } from "../types/index.js";
import type { Infer } from '@vinejs/vine/types';
import { Entity as EntityInputSchema, LinxEntity as LinxEntitySchema } from "../schemas/entity/index.js";
import type { SchemaKey } from "@linxhq/vine-schema-dot-org";

export default interface Entity extends Contract {
    /**
     * The Linx stored representation schema (with system fields).
     */
    Schema: typeof LinxEntitySchema;

    /**
     * Full entity data type (as stored by Linx).
     */
    Data: EntityData;

    /**
     * Input type — inferred directly from the generic Entity schema.
     * No Omit needed: the generic schema IS the input.
     */
    Input: EntityInput;

    /**
     * Entity data with extra methods.
     */
    Hydrated: EntityData & EntityHydrations;
}

/**
 * Full stored data, inferred from the LinxEntity schema.
 */
type EntityData = Infer<typeof LinxEntitySchema>;

/**
 * Input data, inferred from the generic Entity schema.
 * The generic schema only contains user-provided fields — no system fields to omit.
 */
type EntityInput = Infer<typeof EntityInputSchema>;

/**
 * Represents the set of methods and properties used to hydrate and interact with an Entity.
 */
type EntityHydrations = {
    /**
     * The Schema.org root type of this entity.
     */
    type: SchemaKey;

    /**
     * Archives the Entity, marking it as inactive.
     *
     * @returns A promise that resolves when the archive operation is complete.
     */
    archive: () => Promise<void>;

    /**
     * Returns a string representation of the Entity.
     *
     * @returns The string representation.
     */
    toString: () => string;
};
