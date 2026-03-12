import type { SchemaKey } from '@linxhq/vine-schema-dot-org'
import type { RootFactoid } from './root-factoid.js'
import type { HydratedEntityInstance } from './hydrated-entity.js'
import type { GeoCoordinates, GeoShape } from '@linxhq/vine-schema-dot-org'
import type { GasStation as GasStationData } from '@linxhq/vine-schema-dot-org'

// Test 1: What does HydratedEntityInstance<GasStationData> give us for geo?
type Station = HydratedEntityInstance<GasStationData>
declare const station: Station

// Does .geo exist?
const geo = station.geo

// Discriminated union narrowing via .type
if (geo?.type === "GeoCoordinates") {
    const lat = geo.value.latitude
}
