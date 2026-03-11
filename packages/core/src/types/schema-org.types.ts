import _Schemas from "../schemas/schema.org.js";

/**
 * Valid Schema.org root types supported by Linx.
 * Linx enforces strict root typing: all entities must be one of these types.
 * Domain-specific subtypes (e.g., ServiceStation) use the additionalType field.
 */
export type Schemas = `${keyof typeof _Schemas & string}`;
