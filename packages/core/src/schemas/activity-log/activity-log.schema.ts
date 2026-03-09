import vine from "@vinejs/vine";
import { LinxSystemFields } from "../system.js";

/**
 * All possible activity log actions across the platform.
 */
export const ACTIVITY_ACTIONS = [
    'entity.created',
    'entity.fetched',
    'entity.listed',
    'entity.deleted',
    'factoid.created',
    'factoid.fetched',
    'factoid.archived',
    'factoid.suggested',
    'factoid.deduplicated',
    'factoid.verified',
    'vote.cast',
    'vote.changed',
    'report.created',
    'report.reviewed',
    'report.resolved',
    'report.dismissed',
    'claim.submitted',
    'claim.approved',
    'claim.rejected',
    'verification.created',
    'confidence.recalculated',
    'auth.register',
    'auth.login',
    'auth.logout',
    'auth.session_switch',
    'application.created',
    'application.deleted',
    'application.apikey.created',
    'application.apikey.revoked',
    'permission.updated',
    'account.updated',
    'error.unhandled',
] as const;

/**
 * Activity log categories — groups related actions.
 */
export const ACTIVITY_CATEGORIES = [
    'entity',
    'factoid',
    'vote',
    'report',
    'claim',
    'verification',
    'confidence',
    'auth',
    'application',
    'permission',
    'account',
    'system',
] as const;

/**
 * Actor types — who performed the action.
 */
export const ACTOR_TYPES = ['user_account', 'software_application'] as const;

/**
 * Log severity levels.
 */
export const LOG_LEVELS = ['info', 'warn', 'error'] as const;

/**
 * ActivityLog — query/filter schema for SDK and API consumers.
 * All fields are optional to allow flexible filtering.
 */
export const ActivityLog = vine.object({
    action: vine.enum(ACTIVITY_ACTIONS).optional(),
    category: vine.enum(ACTIVITY_CATEGORIES).optional(),
    entityId: vine.string().uuid().optional(),
    factoidId: vine.string().uuid().optional(),
    actorId: vine.string().uuid().optional(),
    actorType: vine.enum(ACTOR_TYPES).optional(),
    resourceType: vine.string().optional(),
    resourceId: vine.string().uuid().optional(),
    level: vine.enum(LOG_LEVELS).optional(),
    page: vine.number().positive().optional(),
    perPage: vine.number().positive().max(100).optional(),
});

/**
 * LinxActivityLog — the stored representation of an activity log entry.
 * Merges system fields (id, createdAt, updatedAt) with activity-specific fields.
 */
export const LinxActivityLog = vine.object({
    ...LinxSystemFields.getProperties(),
    requestId: vine.string(),
    action: vine.enum(ACTIVITY_ACTIONS),
    category: vine.enum(ACTIVITY_CATEGORIES),
    actorType: vine.enum(ACTOR_TYPES),
    actorId: vine.string().uuid(),
    entityId: vine.string().uuid().optional(),
    factoidId: vine.string().uuid().optional(),
    resourceType: vine.string().optional(),
    resourceId: vine.string().uuid().optional(),
    metadata: vine.any().optional(),
    level: vine.enum(LOG_LEVELS),
});
