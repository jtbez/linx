import vine from "@vinejs/vine";
import { LinxFactoid } from "./factoid/index.js";
import { LinxUserAccount } from "./user-account/index.js";
import { LinxSoftwareApplication } from "./software-application/index.js";

/**
 * Transforms a VineJS schema for database storage by replacing nested
 * object fields with UUID foreign key references.
 *
 * @example
 *   toDbSchema(LinxFactoid, { source: "sourceId" })
 *   // Removes `source: LinxSource` → Adds `sourceId: vine.string().uuid()`
 */
export function toDbSchema(
    schema: { getProperties(): Record<string, any> },
    relations: Record<string, string>,
) {
    const props = { ...schema.getProperties() };
    const fkFields: Record<string, any> = {};

    for (const key in relations) {
        if (relations.hasOwnProperty(key)) {
            delete props[key];
            fkFields[relations[key]] = vine.string().uuid();
        }
    }

    return vine.object({ ...props, ...fkFields });
}

/**
 * Flattens the nested `confidence` object into DB-level columns:
 *   confidence: { score, calculatedAt } → confidenceScore + confidenceCalculatedAt
 */
function flattenConfidence(schema: { getProperties(): Record<string, any> }) {
    const { confidence, ...rest } = schema.getProperties();
    return vine.object({
        ...rest,
        confidenceScore: vine.number().range([0, 1]),
        confidenceCalculatedAt: vine.date().nullable(),
    });
}

/** Factoid DB schema — `source` → `sourceId` FK, `confidence` → flat columns */
export const FactoidDb = flattenConfidence(
    toDbSchema(LinxFactoid, { source: "sourceId" })
);

/** UserAccount DB schema — `confidence` → flat columns */
export const UserAccountDb = flattenConfidence(LinxUserAccount);

/** SoftwareApplication DB schema — `confidence` → flat columns */
export const SoftwareApplicationDb = flattenConfidence(LinxSoftwareApplication);

