import vine from "@vinejs/vine";
import { LinxSystemFields } from "../system.js";

/**
 * Claim statuses — lifecycle of an ownership claim.
 *
 * - pending: Submitted, awaiting internal review.
 * - approved: Ownership verified, owner factoid is now authoritative.
 * - rejected: Claim denied.
 */
export const CLAIM_STATUSES = [
    'pending',
    'approved',
    'rejected',
] as const;

/**
 * Claim — user input schema for submitting an ownership claim.
 *
 * A claim asserts that the authenticated user's linked Person/Organization
 * entity is the rightful owner of a target entity. The user must be the
 * account linked to the Person/Organization referenced in the "owner" factoid.
 *
 * @property evidence - Optional supporting evidence or explanation.
 */
export const Claim = vine.object({
    evidence: vine.string().maxLength(5000).optional(),
});

/**
 * LinxClaim — the Linx platform's stored representation of a Claim.
 *
 * Links the claimant's UserAccount to the target entity and the owner factoid.
 * Only the UserAccount whose entity resolves to the Person/Organization
 * referenced in the owner factoid can submit a claim.
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property entityId - FK to the Entity being claimed.
 * @property factoidId - FK to the "owner" Factoid asserting ownership.
 * @property claimantAccountId - FK to the UserAccount submitting the claim.
 * @property status - Current lifecycle status.
 * @property reviewedBy - FK to the UserAccount that reviewed the claim (nullable).
 * @property reviewedAt - When the claim was reviewed (nullable).
 */
export const LinxClaim = vine.object({
    ...Claim.getProperties(),
    ...LinxSystemFields.getProperties(),
    entityId: vine.string().uuid(),
    factoidId: vine.string().uuid(),
    claimantAccountId: vine.string().uuid(),
    status: vine.enum(CLAIM_STATUSES),
    reviewedBy: vine.string().uuid().nullable().optional(),
    reviewedAt: vine.date().nullable().optional(),
});
