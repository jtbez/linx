import { classifyAllProperties, classifyProperty, isFactoidType, isEntityType } from '@linxhq/vine-schema-dot-org'

// ─── Type classification spot checks ─────────────────────────────
console.log('='.repeat(80))
console.log('TYPE CLASSIFICATION (isEntityType / isFactoidType)')
console.log('='.repeat(80))

const SPOT_CHECK_TYPES = [
  // Should be entities
  'Place', 'LocalBusiness', 'GasStation', 'Person', 'Organization', 'Brand',
  'Hotel', 'Restaurant', 'Corporation', 'SportsTeam', 'Airport', 'Museum',
  // Should be factoids (StructuredValue descendants)
  'GeoCoordinates', 'GeoShape', 'PostalAddress', 'ContactPoint',
  'OpeningHoursSpecification', 'PropertyValue', 'QuantitativeValue',
  'MonetaryAmount', 'PriceSpecification', 'NutritionInformation',
  // Should be factoids (DataType descendants)
  'Text', 'Number', 'Boolean', 'Date', 'DateTime', 'Time', 'Float', 'Integer', 'URL',
  // Should be factoids (Enumeration descendants)
  'DayOfWeek', 'EventStatusType', 'MapCategoryType',
  // Potentially tricky (Intangible but NOT StructuredValue/Enumeration)
  'Service', 'Offer', 'Demand', 'Role', 'Rating', 'BedDetails',
  'Reservation', 'Trip', 'MenuItem', 'Order',
  // CreativeWork and descendants
  'CreativeWork', 'Review', 'Article', 'WebPage', 'Photograph', 'ImageObject',
  // Event
  'Event', 'MusicEvent',
  // Action
  'Action', 'SearchAction',
  // Product
  'Product',
]

for (const t of SPOT_CHECK_TYPES) {
  const label = isEntityType(t) ? 'ENTITY' : 'FACTOID'
  console.log(`  ${label.padEnd(8)} ${t}`)
}

// ─── Property classification for key types ───────────────────────

const TEST_TYPES = [
  'Place',
  'LocalBusiness',
  'GasStation',
  'Hotel',
  'Person',
  'Organization',
  'Brand',
  'Restaurant',
  'Hospital',
  'Thing',
]

console.log('')
console.log('='.repeat(80))
console.log('PROPERTY CLASSIFICATION FOR KEY TYPES')
console.log('='.repeat(80))

for (const typeName of TEST_TYPES) {
  console.log(`\n── ${typeName} ${'─'.repeat(70 - typeName.length)}`)

  const props = classifyAllProperties(typeName)
  const entries = Object.entries(props).sort((a, b) => {
    const order = { entity: 0, mixed: 1, factoid: 2 }
    return order[a[1].kind] - order[b[1].kind] || a[0].localeCompare(b[0])
  })

  const entities = entries.filter(([, v]) => v.kind === 'entity')
  const mixed = entries.filter(([, v]) => v.kind === 'mixed')
  const factoids = entries.filter(([, v]) => v.kind === 'factoid')

  if (entities.length > 0) {
    console.log(`\n  ENTITY PROPERTIES (${entities.length}):`)
    for (const [prop, { typeRefs }] of entities) {
      console.log(`    ${prop.padEnd(35)} → ${typeRefs.join(', ')}`)
    }
  }

  if (mixed.length > 0) {
    console.log(`\n  MIXED PROPERTIES (${mixed.length}):`)
    for (const [prop, { typeRefs }] of mixed) {
      console.log(`    ${prop.padEnd(35)} → ${typeRefs.join(', ')}`)
    }
  }

  if (factoids.length > 0) {
    console.log(`\n  FACTOID PROPERTIES (${factoids.length}):`)
    for (const [prop, { typeRefs }] of factoids) {
      console.log(`    ${prop.padEnd(35)} → ${typeRefs.join(', ')}`)
    }
  }
}

// ─── Find ALL mixed properties across every type ─────────────────

import schemaMeta from '@linxhq/vine-schema-dot-org/schema-meta'

console.log('')
console.log('='.repeat(80))
console.log('ALL MIXED PROPERTIES (potential edge cases)')
console.log('='.repeat(80))

const meta = schemaMeta as Record<string, { parent?: string; typeRefs: Record<string, string[]> }>
const allMixed: { type: string; prop: string; refs: string[] }[] = []

for (const [typeName, typeMeta] of Object.entries(meta)) {
  if (!typeMeta.typeRefs) continue
  for (const [prop, refs] of Object.entries(typeMeta.typeRefs)) {
    const kind = classifyProperty(typeName, prop)
    if (kind === 'mixed') {
      allMixed.push({ type: typeName, prop, refs })
    }
  }
}

// Deduplicate by property name + refs
const seen = new Set<string>()
for (const { type, prop, refs } of allMixed) {
  const key = `${prop}:${refs.join(',')}`
  if (seen.has(key)) continue
  seen.add(key)
  console.log(`  ${type}.${prop.padEnd(30)} → ${refs.join(', ')}`)
}
console.log(`\n  Total unique mixed properties: ${seen.size}`)
