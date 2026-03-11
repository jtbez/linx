import { createCustomSchemas, SCHEMA_KEYS } from "@linxhq/vine-schema-dot-org";
import { LinxFactoid } from "./factoid/index.js";
import type { Schemas } from "../types/schema-org.types.js";

// Wraps all Schema.org properties in the LinxFactoid schema (stored representation)
const Schemas: ReturnType<typeof createCustomSchemas> = createCustomSchemas({
    additionalProperties: LinxFactoid,
});


export default Schemas; // Exports the constant and type

export { SCHEMA_KEYS, Schemas }; // Allows exporting the type and keys from barrel files