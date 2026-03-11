import vine from "@vinejs/vine";
import { Source, LinxSource } from "./source.schema.js"
import { Confidence } from "../confidence/index.js"
import { LinxSystemFields } from "../system.js"
import { SCHEMA_KEYS } from "../schema.org.js"

/**
 * Factoid — a generic piece of information with its source.
 *
 * This is the canonical definition of what a factoid IS: a single
 * attribute-value pair (e.g., name="BP") along with optional source
 * provenance. It serves as the user input schema for creating a new
 * factoid — what a developer provides.
 *
 * The Linx-specific variant (LinxFactoid) extends this with system-managed
 * fields: identity, entity association, confidence scoring, currency tracking,
 * and full source provenance (LinxSource).
 *
 * @property attribute - The property name (e.g., "name", "address").
 * @property value - The value of the attribute, can be any type.
 * @property source - Optional source provenance (reference and notes).
 */
export const Factoid = vine.object({
    attribute: vine.string(),
    value: vine.any(),
    source: Source,
});

/**
 * Suggest — input for suggesting an alternative value for an existing factoid.
 *
 * Same as Factoid but without the attribute, which is inherited from the
 * original factoid being suggested against. This is not stripping a system
 * field — it's expressing that suggestions don't specify an attribute.
 */
const { attribute, ...suggestProps } = Factoid.getProperties();
export const Suggest = vine.object(suggestProps);

/**
 * LinxFactoid — the Linx platform's stored representation of a Factoid.
 *
 * Adds system-managed fields: identity, entity association, confidence
 * scoring, currency tracking, and full source provenance (LinxSource
 * replaces the generic Source with provenance type and account IDs).
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property entityId - FK to the Entity this factoid describes.
 * @property confidence - Cached confidence metadata (score + cache timestamp).
 * @property isCurrent - Whether this is the current accepted value for the attribute.
 * @property source - Full Linx provenance (type, userAccountId, applicationId, ref, notes).
 */
export const LinxFactoid = vine.object({
    ...Factoid.getProperties(),
    ...LinxSystemFields.getProperties(),
    entityId: vine.string().uuid(),
    type: vine.enum(SCHEMA_KEYS),
    confidence: Confidence,
    isCurrent: vine.boolean(),
    source: LinxSource,
});