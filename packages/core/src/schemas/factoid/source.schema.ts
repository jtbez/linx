import vine from "@vinejs/vine";
import { LinxSystemFields } from "../system.js";

/**
 * Source — a generic, reusable schema describing the origin of information.
 *
 * This is the canonical definition of what a source IS: optional reference
 * and notes fields that any system could use. It serves as the user input
 * schema — what a developer provides when attaching source info to data.
 *
 * The Linx-specific variant (LinxSource) extends this with system-managed
 * fields like provenance type and account IDs resolved from auth context.
 *
 * @property ref - Optional external reference identifier (URL, ID, etc.).
 * @property notes - Optional free-text context about the source.
 */
export const Source = vine.object({
    ref: vine.string().optional(),
    notes: vine.string().optional(),
});

/**
 * LinxSource — the Linx platform's implementation of Source.
 *
 * Adds system-resolved provenance tracking: who submitted the data (type,
 * userAccountId) and optionally through which application (applicationId).
 * These fields are determined by the auth context, never by user input.
 *
 * Sources track dual provenance: both the UserAccount that submitted data and
 * optionally the SoftwareApplication they used. When a 3rd party app submits
 * on behalf of a user, both userAccountId and applicationId are set.
 *
 * @property type - How the data was obtained:
 *   - "user_account": Submitted directly by a UserAccount.
 *   - "api_import": Imported from an external API.
 *   - "verified_business": Verified by trusted means.
 *   - "software_application": Submitted via a 3rd party SoftwareApplication.
 * @property userAccountId - UUID of the UserAccount that created/submitted the data.
 * @property applicationId - UUID of the SoftwareApplication used to submit (if any).
 */
export const LinxSource = vine.object({
    ...Source.getProperties(),
    ...LinxSystemFields.getProperties(),
    type: vine.enum(['user_account', 'api_import', 'verified_business', 'software_application']),
    userAccountId: vine.string().uuid().optional(),
    applicationId: vine.string().uuid().optional(),
});
