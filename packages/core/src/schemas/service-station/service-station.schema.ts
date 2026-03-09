import Schemas from "../schema.org.js";

/**
 * ServiceStation extends LocalBusiness.
 *
 * Uses Schema.org properties:
 * - containsPlace: child entities (GasStation, FastFoodRestaurant, etc.)
 * - containedInPlace: parent location (motorway)
 * - amenityFeature: facilities (toilets, parking, wifi, etc.)
 * - operator, openingHours, telephone, etc.
 *
 * additionalType: "ServiceStation"
 */
export const ServiceStation: any = Schemas.LocalBusiness;
export type ServiceStation = Record<string, unknown>;

/**
 * Known amenity feature keys for service stations.
 * Used as collection_key values for amenityFeature factoids.
 */
export const SERVICE_STATION_AMENITY_KEYS = [
    "toilets",
    "accessibleToilets",
    "babyChange",
    "showers",
    "wifi",
    "atm",
    "parking",
    "hgvParking",
    "benches",
    "picnicTables",
    "playground",
    "outdoorSeating",
    "payphone",
    "postBox",
    "wasteBins",
    "drinkingWater",
    "compressedAir",
    "recycling",
    "indoorPlay",
    "foodCourt",
    "police",
    "information",
    "evCharging",
    "bicycleParking",
    "motorcycleParking",
    "defibrillator",
    "emergencyPhone",
    "gritBin",
    "loadingDock",
    "lifeRing",
    "disabledParking",
    "fireHydrant",
] as const;

export type ServiceStationAmenityKey = (typeof SERVICE_STATION_AMENITY_KEYS)[number];
