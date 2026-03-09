import vine from "@vinejs/vine";
import { Confidence } from "../confidence/index.js"
import { LinxSystemFields } from "../system.js"

/**
 * SoftwareApplication — generic application identity.
 *
 * This is the canonical definition of what a software application IS:
 * just a name. It serves as the user input schema for registering a new
 * application.
 *
 * The Linx-specific variant (LinxSoftwareApplication) extends this with
 * system-managed fields: entity association, owning organisation, and
 * confidence scoring.
 *
 * @property name - Display name of the application.
 */
export const SoftwareApplication = vine.object({
    name: vine.string().minLength(1),
});

/**
 * LinxSoftwareApplication — the Linx platform's stored representation.
 *
 * The Schema.org SoftwareApplication type (from @linxhq/vine-schema-dot-org)
 * defines the Entity's properties as Factoids. This schema is the DB record
 * that links that Entity to its owning Organisation's UserAccount and enables
 * API key auth.
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property entityId - FK to the SoftwareApplication Entity.
 * @property organisationAccountId - FK to the UserAccount of the owning Organisation.
 * @property confidence - Cached confidence metadata. Score is computed from raw vote
 *   ratios on the application's Factoids and its users' confidence scores.
 */
export const LinxSoftwareApplication = vine.object({
    ...SoftwareApplication.getProperties(),
    ...LinxSystemFields.getProperties(),
    entityId: vine.string().uuid(),
    organisationAccountId: vine.string().uuid(),
    confidence: Confidence,
    allowedOrigins: vine.array(vine.string()).nullable(),
    requireDpop: vine.boolean(),
});
