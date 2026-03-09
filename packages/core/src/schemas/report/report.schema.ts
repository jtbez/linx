import vine from "@vinejs/vine";
import { LinxSystemFields } from "../system.js";

/**
 * Report reasons — categories of problems that can be flagged on a factoid.
 */
export const REPORT_REASONS = [
    'spam',
    'inaccurate',
    'incomplete',
    'defamatory',
    'opinion_not_fact',
    'outdated',
    'duplicate',
    'offensive',
    'misleading',
    'copyright_violation',
] as const;

/**
 * Report statuses — lifecycle of a report.
 */
export const REPORT_STATUSES = [
    'open',
    'reviewed',
    'resolved',
    'dismissed',
] as const;

/**
 * Report — user input schema for reporting a problem with a factoid.
 *
 * @property reason - The category of the problem.
 * @property description - Optional free-text explanation.
 */
export const Report = vine.object({
    reason: vine.enum(REPORT_REASONS),
    description: vine.string().maxLength(2000).optional(),
});

/**
 * LinxReport — the Linx platform's stored representation of a Report.
 *
 * Each report links a reporter (UserAccount) to a factoid with a reason
 * and optional description. Reports in 'open' or 'reviewed' status are
 * considered active and reduce the factoid's confidence score.
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property factoidId - FK to the Factoid being reported.
 * @property reporterId - FK to the UserAccount that filed the report.
 * @property status - Current lifecycle status.
 * @property resolvedBy - FK to the UserAccount that resolved the report (nullable).
 * @property resolvedAt - When the report was resolved (nullable).
 */
export const LinxReport = vine.object({
    ...Report.getProperties(),
    ...LinxSystemFields.getProperties(),
    factoidId: vine.string().uuid(),
    reporterId: vine.string().uuid(),
    status: vine.enum(REPORT_STATUSES),
    resolvedBy: vine.string().uuid().nullable().optional(),
    resolvedAt: vine.date().nullable().optional(),
});
