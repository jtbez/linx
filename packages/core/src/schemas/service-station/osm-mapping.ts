/**
 * OSM → Schema.org mapping rules for service station data.
 *
 * Classifies OSM elements as either child Entities (separate businesses)
 * or amenityFeatures of the parent service station.
 */

/** OSM tag values that produce child entities (separate businesses) */
export const OSM_ENTITY_MAP = {
    // amenity tags
    fuel: { type: "LocalBusiness", additionalType: "GasStation" },
    fast_food: {
        type: "LocalBusiness",
        additionalType: "FastFoodRestaurant",
    },
    cafe: {
        type: "LocalBusiness",
        additionalType: "CafeOrCoffeeShop",
    },
    restaurant: {
        type: "LocalBusiness",
        additionalType: "Restaurant",
    },
    car_wash: { type: "LocalBusiness", additionalType: "AutoWash" },
    car_repair: {
        type: "LocalBusiness",
        additionalType: "AutoRepair",
    },
    // shop tags
    convenience: {
        type: "LocalBusiness",
        additionalType: "ConvenienceStore",
    },
    newsagent: { type: "LocalBusiness", additionalType: "Store" },
    supermarket: { type: "LocalBusiness", additionalType: "Store" },
    bakery: { type: "LocalBusiness", additionalType: "Bakery" },
    books: { type: "LocalBusiness", additionalType: "BookStore" },
    coffee: {
        type: "LocalBusiness",
        additionalType: "CafeOrCoffeeShop",
    },
    laundry: {
        type: "LocalBusiness",
        additionalType: "DryCleaningOrLaundry",
    },
    mobile_phone: { type: "LocalBusiness", additionalType: "Store" },
    clothes: {
        type: "LocalBusiness",
        additionalType: "ClothingStore",
    },
    kiosk: { type: "LocalBusiness", additionalType: "Kiosk" },
    deli: { type: "LocalBusiness", additionalType: "Deli" },
    gift: { type: "LocalBusiness", additionalType: "GiftShop" },
    erotic: {
        type: "LocalBusiness",
        additionalType: "AdultEntertainment",
    },
    electronics: {
        type: "LocalBusiness",
        additionalType: "ElectronicsStore",
    },
    bag: { type: "LocalBusiness", additionalType: "BagShop" },
    lottery: {
        type: "LocalBusiness",
        additionalType: "LotteryShop",
    },
    farm: { type: "LocalBusiness", additionalType: "FarmShop" },
    stationery: {
        type: "LocalBusiness",
        additionalType: "StationeryShop",
    },
    hairdresser: {
        type: "LocalBusiness",
        additionalType: "HairSalon",
    },
    mall: {
        type: "LocalBusiness",
        additionalType: "ShoppingCenter",
    },
    // tourism tags
    hotel: { type: "LocalBusiness", additionalType: "Hotel" },
    motel: { type: "LocalBusiness", additionalType: "Motel" },
    information: {
        type: "LocalBusiness",
        additionalType: "TouristInformationCenter",
    },
    // leisure tags
    adult_gaming_centre: {
        type: "LocalBusiness",
        additionalType: "EntertainmentBusiness",
    },
    amusement_arcade: {
        type: "LocalBusiness",
        additionalType: "EntertainmentBusiness",
    },
    park: { type: "Place", additionalType: "Park" },
    golf_course: {
        type: "LocalBusiness",
        additionalType: "GolfCourse",
    },
} as const;

/** OSM amenity tag values that map to parent amenityFeature (not child entities) */
export const OSM_AMENITY_MAP = {
    toilets: "toilets",
    parking: "parking",
    bench: "benches",
    waste_basket: "wasteBins",
    telephone: "payphone",
    post_box: "postBox",
    drinking_water: "drinkingWater",
    compressed_air: "compressedAir",
    recycling: "recycling",
    food_court: "foodCourt",
    police: "police",
    shower: "showers",
    atm: "atm",
    bicycle_parking: "bicycleParking",
    motorcycle_parking: "motorcycleParking",
    watering_place: "drinkingWater",
} as const;

/** OSM inline tags on the parent `highway: services` element that become amenityFeatures */
export const OSM_PARENT_TAG_MAP = {
    toilets: "toilets",
    "toilets:wheelchair": "accessibleToilets",
    changing_table: "babyChange",
    shower: "showers",
    internet_access: "wifi",
    atm: "atm",
    outdoor_seating: "outdoorSeating",
} as const;

/** OSM leisure tag values that become amenityFeatures */
export const OSM_LEISURE_AMENITY_MAP = {
    picnic_table: "picnicTables",
    playground: "playground",
    indoor_play: "indoorPlay",
    outdoor_seating: "outdoorSeating",
} as const;

/** OSM `emergency` tag values that become amenityFeatures */
export const OSM_EMERGENCY_AMENITY_MAP = {
    defibrillator: "defibrillator",
    phone: "emergencyPhone",
    life_ring: "lifeRing",
    fire_hydrant: "fireHydrant",
} as const;

/** OSM `emergency` tag values to skip (too generic to classify) */
export const OSM_EMERGENCY_SKIP = ["yes"] as const;

/**
 * OSM `amenity` values that contribute detail to an existing amenityFeature
 * rather than creating a new one. E.g. parking_space with disabled tag
 * contributes "disabledParking" to the station.
 */
export const OSM_AMENITY_DETAIL_MAP = {
    parking_space: "disabledParking",
} as const;

/** OSM tag values to skip entirely during import */
export const OSM_SKIP_TAGS = [
    "boundary",
    "parking_entrance",
    "vacant",
    "service",
] as const;

/**
 * OSM tag values where brand presence determines entity vs amenity:
 * - WITH brand → child entity
 * - WITHOUT brand → amenityFeature
 */
export const OSM_BRAND_DEPENDENT = [
    "charging_station",
    "vending_machine",
    "parcel_locker",
    "casino",
    "gambling",
] as const;
