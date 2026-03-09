/**
 * Explicit mapping of SDK accessor names to their Schema.org data types.
 *
 * Uses the interface types from vine-schema-dot-org directly, which avoids
 * TypeScript's inability to resolve conditional mapped types through
 * ReturnType<typeof createCustomSchemas>.
 *
 * Each key is the camelCase accessor name used on the SDK client:
 *   client.gasStation("id") → HydratedEntityInstance<SchemaTypeMap["gasStation"]>
 */
import type {
    Place,
    LocalBusiness,
    Brand,
    Person,
    Organization,
    Thing,
    Airport,
    Beach,
    BusStation,
    Campground,
    Cemetery,
    Church,
    Library,
    MovieTheater,
    Museum,
    Park,
    School,
    StadiumOrArena,
    TrainStation,
    Zoo,
    BarOrPub,
    CafeOrCoffeeShop,
    ConvenienceStore,
    FastFoodRestaurant,
    GasStation,
    GroceryStore,
    Hospital,
    Hotel,
    Restaurant,
    ShoppingCenter,
    Store,
    Corporation,
    EducationalOrganization,
    GovernmentOrganization,
    MedicalOrganization,
    NGO,
    SportsTeam,
} from '@linxhq/vine-schema-dot-org'

export type SchemaTypeMap = {
    // Root types
    place: Place
    localBusiness: LocalBusiness
    brand: Brand
    person: Person
    organization: Organization
    thing: Thing

    // Place subtypes
    airport: Airport
    beach: Beach
    busStation: BusStation
    campground: Campground
    cemetery: Cemetery
    church: Church
    library: Library
    movieTheater: MovieTheater
    museum: Museum
    park: Park
    school: School
    stadiumOrArena: StadiumOrArena
    trainStation: TrainStation
    zoo: Zoo

    // LocalBusiness subtypes
    barOrPub: BarOrPub
    cafeOrCoffeeShop: CafeOrCoffeeShop
    convenienceStore: ConvenienceStore
    fastFoodRestaurant: FastFoodRestaurant
    gasStation: GasStation
    groceryStore: GroceryStore
    hospital: Hospital
    hotel: Hotel
    restaurant: Restaurant
    /** ServiceStation is a domain-level alias for LocalBusiness */
    serviceStation: LocalBusiness
    shoppingCenter: ShoppingCenter
    store: Store

    // Organization subtypes
    corporation: Corporation
    educationalOrganization: EducationalOrganization
    governmentOrganization: GovernmentOrganization
    medicalOrganization: MedicalOrganization
    nGO: NGO
    sportsTeam: SportsTeam
}
