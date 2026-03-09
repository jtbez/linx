import vine from "@vinejs/vine";

/**
 * Fields managed by the Linx platform — present on all stored records.
 *
 * These are never part of user input; they are assigned by the system
 * when records are created or updated. All Linx-specific schema variants
 * (LinxEntity, LinxFactoid, etc.) merge these fields into the generic
 * schema to produce the stored representation.
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property createdAt - Timestamp when the record was created.
 * @property updatedAt - Timestamp when the record was last modified.
 */
export const LinxSystemFields = vine.object({
    id: vine.string().uuid(),
    createdAt: vine.date(),
    updatedAt: vine.date(),
});
