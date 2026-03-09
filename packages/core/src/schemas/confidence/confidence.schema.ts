import vine from "@vinejs/vine";

/**
 * Reusable Confidence schema — a score with a cache timestamp.
 *
 * Embedded into Factoid, UserAccount, and SoftwareApplication schemas.
 * In the database this maps to two flat columns: `confidence_score`
 * and `confidence_calculated_at`.
 *
 * @property score - Confidence value between 0 (lowest) and 1 (highest).
 * @property calculatedAt - When the score was last computed. Null means
 *   the cached score is stale and must be recalculated on next read.
 */
export const Confidence = vine.object({
    score: vine.number().range([0, 1]),
    calculatedAt: vine.date().nullable(),
});
