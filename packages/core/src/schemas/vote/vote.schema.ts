import vine from "@vinejs/vine";
import { LinxSystemFields } from "../system.js";

/**
 * Vote — a generic expression of approval or disapproval.
 *
 * This is the canonical definition of what a vote IS: just a direction.
 * It serves as the user input schema — what a developer provides when
 * casting a vote.
 *
 * The Linx-specific variant (LinxVote) extends this with system-managed
 * fields: identity, voter/factoid associations, and timestamps.
 *
 * @property direction - 'up' (agree / endorse) or 'down' (disagree / dispute).
 */
export const Vote = vine.object({
    direction: vine.enum(['up', 'down']),
});

/**
 * LinxVote — the Linx platform's stored representation of a Vote.
 *
 * Each UserAccount may cast at most one vote per Factoid. The vote direction
 * can be changed but not duplicated. Votes are the raw input to the confidence
 * scoring algorithm.
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property voterId - FK to the UserAccount that cast the vote.
 * @property factoidId - FK to the Factoid being voted on.
 */
export const LinxVote = vine.object({
    ...Vote.getProperties(),
    ...LinxSystemFields.getProperties(),
    voterId: vine.string().uuid(),
    factoidId: vine.string().uuid(),
});
