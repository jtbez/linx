import schemaMeta from '@linxhq/vine-schema-dot-org/schema-meta'

const meta = schemaMeta as Record<string, { parent?: string }>

/**
 * Maps camelCase method names to Schema.org type names.
 * gasStation → GasStation, hotel → Hotel, etc.
 */
export function resolveSchemaType(camelName: string): string {
    return camelName.charAt(0).toUpperCase() + camelName.slice(1)
}

/**
 * Root types stored as first-class entities in the Linx API.
 * Types that map to themselves are entity entry points.
 */
const LINX_ROOTS = new Set(['Place', 'LocalBusiness', 'Brand', 'Person', 'Organization', 'Thing'])

/**
 * Domain-level types that are not in Schema.org but map to a Linx root type.
 * These are custom additionalType values used as SDK accessors.
 */
const DOMAIN_TYPE_ROOTS: Record<string, string> = {
    ServiceStation: 'LocalBusiness',
}

/**
 * Dynamically resolves a Schema.org type to its Linx root type
 * by walking up the parent chain in schema-meta.json.
 *
 * GasStation → LocalBusiness (via AutomotiveBusiness → LocalBusiness)
 * Hotel → LocalBusiness (via LodgingBusiness → LocalBusiness)
 * Museum → Place
 * ServiceStation → LocalBusiness (domain-level override)
 */
export function resolveRootType(schemaType: string): string {
    if (LINX_ROOTS.has(schemaType)) return schemaType

    if (DOMAIN_TYPE_ROOTS[schemaType]) return DOMAIN_TYPE_ROOTS[schemaType]

    let current: string | undefined = meta[schemaType]?.parent
    while (current && current !== 'Thing') {
        if (LINX_ROOTS.has(current)) return current
        current = meta[current]?.parent
    }

    return 'Thing'
}
