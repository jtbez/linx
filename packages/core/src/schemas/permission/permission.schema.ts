import vine from "@vinejs/vine";

/**
 * Schema for a Permission record — controls what actions a UserAccount or
 * SoftwareApplication can perform and on which Entity types.
 *
 * Permissions are polymorphic: holderId + holderType identify the holder
 * (either a UserAccount or SoftwareApplication).
 *
 * @property id - Unique identifier for the permission (UUID).
 * @property holderId - UUID of the UserAccount or SoftwareApplication.
 * @property holderType - Whether the holder is a 'user_account' or 'software_application'.
 * @property action - The action this permission grants.
 * @property scope - Which Schema.org Entity type this permission applies to, or '*' for all.
 * @property entityId - Optional: restricts to a specific Entity. Null means all entities of the scope type.
 */
export const Permission = vine.object({
    id: vine.string().uuid(),
    holderId: vine.string().uuid(),
    holderType: vine.enum(['user_account', 'software_application']),
    action: vine.enum(['read', 'create', 'update', 'vote', 'suggest', 'archive', 'admin', 'create_api_key', 'read_own_logs', 'read_all_logs', 'report', 'claim', 'verify', 'review_claims', 'review_reports']),
    scope: vine.enum(['*', 'Place', 'Person', 'Organization', 'Thing', 'SoftwareApplication']),
    entityId: vine.string().uuid().optional(),
    createdAt: vine.date(),
    updatedAt: vine.date(),
});
