import vine from "@vinejs/vine";
import { LinxSystemFields } from "../system.js";

/**
 * Verification — a record that an entity owner has verified a factoid.
 *
 * Only entities with an approved ownership claim can have their factoids
 * verified. The verifier must be the UserAccount linked to the approved
 * owner. Verified factoids receive an exponential confidence boost.
 *
 * This is more than a boolean — each verification is a traceable record
 * with the verifier identity, entity context, and timestamp.
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property factoidId - FK to the Factoid being verified.
 * @property entityId - FK to the Entity context (the claimed entity).
 * @property verifiedByAccountId - FK to the UserAccount that performed verification.
 * @property claimId - FK to the approved Claim that authorizes this verification.
 */
export const Verification = vine.object({
    ...LinxSystemFields.getProperties(),
    factoidId: vine.string().uuid(),
    entityId: vine.string().uuid(),
    verifiedByAccountId: vine.string().uuid(),
    claimId: vine.string().uuid(),
});
