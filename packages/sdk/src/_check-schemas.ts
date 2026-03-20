import type { SchemaKey } from '@linxhq/vine-schema-dot-org'
import type { RootFactoid } from './root-factoid.js'
import type { HydratedEntityInstance } from './hydrated-entity.js'
import type { GeoCoordinates, GeoShape } from '@linxhq/vine-schema-dot-org'
import type { GasStation as GasStationData, Place } from '@linxhq/vine-schema-dot-org'

// Test 1: What does HydratedEntityInstance<GasStationData> give us for geo?
type Station = HydratedEntityInstance<GasStationData>
declare const station: Station

// Does .geo exist?
const geo = station.geo

// Discriminated union narrowing via .type
if (geo?.type === "GeoCoordinates") {
    const lat = geo.value.latitude
}

// Test 2: Entity-type properties are arrays of RootFactoids
const containedIn = station.containedInPlace
//    ^? RootFactoid<HydratedEntityInstance<Place>, "Place">[] | undefined

const firstLink = containedIn?.[0]
//    ^? RootFactoid<HydratedEntityInstance<Place>, "Place"> | undefined

// RootFactoid.type is the Schema.org type literal
const linkType = firstLink?.type
//    ^? "Place" | undefined

// HydratedEntityInstance.type is the descendants union
const entity = firstLink?.value
const entityType = entity?.type
//    ^? "Accommodation" | "AdministrativeArea" | "CivicStructure" | ... | "Place" | undefined

// Narrowing on entity.type
if (entity?.type === 'LocalBusiness') {
    const narrowed = entity.type // "LocalBusiness"
}

// Nested entity factoids retain full functionality
const placeName = entity?.name?.value  // string
const placeGeo = entity?.geo           // RootFactoid<GeoCoordinates, "GeoCoordinates"> | ... | undefined
