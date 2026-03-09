import vine from "@vinejs/vine";

/**
 * VineJS schema for a single FactoidMap entry's value.
 * The value object must contain at least one identifiable key field.
 */
export const FactoidMapEntry = vine.object({
    key: vine.string().optional(),
    propertyID: vine.string().optional(),
    name: vine.string().optional(),
    value: vine.any(),
});
