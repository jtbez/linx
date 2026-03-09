import vine from "@vinejs/vine";
import { SCHEMA_KEYS } from "../schema.org.js";
import { LinxSystemFields } from "../system.js";
import { Factoid } from "../factoid/index.js";

/**
 * Entity — a generic Schema.org typed record.
 *
 * This is the canonical definition of what an entity IS: a typed record
 * with an optional domain-specific subtype. It serves as the user input
 * schema — what a developer provides when creating an entity.
 *
 * The Linx-specific variant (LinxEntity) extends this with system-managed
 * identity and timestamps.
 *
 * @property type - The Schema.org root type (Place, Person, Organization, Thing).
 * @property additionalType - Optional domain-specific subtype (e.g., "ServiceStation").
 */
export const Entity = vine.object({
    type: vine.enum(SCHEMA_KEYS),
    additionalType: vine.string().optional(),
});

/**
 * LinxEntity — the Linx platform's stored representation of an Entity.
 * Adds system-managed unique identifier and timestamps.
 */
export const LinxEntity = vine.object({
    ...Entity.getProperties(),
    ...LinxSystemFields.getProperties(),
});

/**
 * EntityWithAttributes — batch creation input: an entity plus its initial
 * set of factoid attributes. Each attribute follows the generic Factoid schema
 * (attribute + value + source).
 */
export const EntityWithAttributes = vine.object({
    ...Entity.getProperties(),
    attributes: vine.array(Factoid),
});
