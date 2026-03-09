/**
 * FactoidMap — a keyed collection of factoids sharing the same attribute.
 *
 * When a Schema.org property has multiple independently-votable values
 * (e.g., amenityFeature with wifi, atm, showers), each value is stored
 * as a separate factoid row. The FactoidMap groups them by a key extracted
 * from the value object.
 *
 * Key extraction: tries fields in order from KEYED_TYPES config.
 * Key stays in the value JSON — no separate DB column needed.
 *
 * This module is intentionally VineJS-free so it can be imported in
 * browser environments (e.g., the SDK, playground) without pulling
 * in Node.js-only dependencies.
 */

/** Schema.org types whose factoids should be grouped into maps, with key field priority */
export const KEYED_TYPES: Record<string, string[]> = {
    LocationFeatureSpecification: ['key', 'propertyID', 'name'],
    PropertyValue: ['propertyID', 'name'],
};

/** Check if a Schema.org factoid type should produce a FactoidMap */
export function isKeyedType(type: string): boolean {
    return type in KEYED_TYPES;
}

/** Extract the collection key from a factoid's value object */
export function extractCollectionKey(type: string, value: unknown): string | null {
    const fields = KEYED_TYPES[type];
    if (!fields || typeof value !== 'object' || value === null) return null;
    for (const field of fields) {
        const v = (value as Record<string, unknown>)[field];
        if (typeof v === 'string') return v;
    }
    return null;
}
