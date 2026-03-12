import { createCustomSchemas, SCHEMA_KEYS } from "@linxhq/vine-schema-dot-org";
import { LinxFactoid } from "./factoid/index.js";

// Wraps all Schema.org properties in the LinxFactoid schema (stored representation)
const Schemas: ReturnType<typeof createCustomSchemas> = createCustomSchemas({
    additionalProperties: LinxFactoid,
});

// Companion type: Schemas["Place"] resolves to the Place data interface
type _Registry = ReturnType<typeof createCustomSchemas>;
type _InferData<T> = T extends { create(data: infer D): any } ? D : never;
type Schemas = { [K in keyof _Registry]: _InferData<_Registry[K]> };

export default Schemas;
export { SCHEMA_KEYS, Schemas };