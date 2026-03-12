// Generic schemas (user input / canonical definitions)
export { Entity, Factoid, Source, Suggest, Confidence, Vote, UserAccount, SoftwareApplication, Permission } from "./schemas/index.js";
export { LinxEntity, LinxFactoid, LinxSource, LinxVote, LinxUserAccount, LinxSoftwareApplication, LinxSystemFields } from "./schemas/index.js";

// Composite input schemas
export { EntityWithAttributes, Register, AuthAs } from "./schemas/index.js";

// Service station domain schemas
export {
    ServiceStation,
    SERVICE_STATION_AMENITY_KEYS,
    OSM_ENTITY_MAP,
    OSM_AMENITY_MAP,
    OSM_PARENT_TAG_MAP,
    OSM_LEISURE_AMENITY_MAP,
    OSM_SKIP_TAGS,
    OSM_BRAND_DEPENDENT,
} from "./schemas/index.js";
export type { ServiceStationAmenityKey } from "./schemas/index.js";

// Report, Claim, Verification schemas
export { Report, LinxReport, REPORT_REASONS, REPORT_STATUSES } from "./schemas/index.js";
export { Claim, LinxClaim, CLAIM_STATUSES } from "./schemas/index.js";
export { Verification } from "./schemas/index.js";

// Activity log schemas
export {
    ActivityLog,
    LinxActivityLog,
    ACTIVITY_ACTIONS,
    ACTIVITY_CATEGORIES,
    ACTOR_TYPES,
    LOG_LEVELS,
} from "./schemas/index.js";

// DB schemas
export { toDbSchema, FactoidDb, UserAccountDb, SoftwareApplicationDb } from "./schemas/index.js";

// FactoidMap — keyed collections of factoids sharing the same attribute
export { KEYED_TYPES, isKeyedType, extractCollectionKey, FactoidMapEntry } from "./schemas/index.js";

// Schema.org schemas registry (runtime object)
export { Schemas, SCHEMA_KEYS } from "./schemas/index.js";

// Types
export type { Contract, SchemaTypeMap } from "./types/index.js";

// Filter types
export type { FilterOp, FilterField, FilterCondition, EntityField } from "./types/index.js";
export { ENTITY_LEVEL_FIELDS } from "./types/index.js";

// Model column types (derived from VineJS schemas for Lucid interface merging)
export type {
    EntityColumns,
    FactoidColumns,
    SourceColumns,
    UserAccountColumns,
    SoftwareApplicationColumns,
    VoteColumns,
    PermissionColumns,
    ActivityLogColumns,
    ReportColumns,
    ClaimColumns,
    VerificationColumns,
} from "./types/index.js";

// Contracts
export type { FactoidContract, EntityContract, UserAccountContract, SoftwareApplicationContract, ActivityLogContract } from "./contracts/index.js";

// Property classifier (re-exported from vine-schema-dot-org)
export { classifyProperty, classifyAllProperties, isEntityType, isFactoidType } from "@linxhq/vine-schema-dot-org";
export type { PropertyKind } from "@linxhq/vine-schema-dot-org";
