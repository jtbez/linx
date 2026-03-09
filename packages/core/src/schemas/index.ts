// Generic schemas — what things ARE (reusable, unopinionated, like schema.org)
// These serve as user input schemas — no pick/omit needed.
import { Entity, LinxEntity, EntityWithAttributes } from "./entity/index.js";
import { Factoid, Source, Suggest, LinxFactoid, LinxSource } from "./factoid/index.js";
import { Confidence } from "./confidence/index.js";
import { Vote, LinxVote } from "./vote/index.js";
import { UserAccount, LinxUserAccount, Register, AuthAs } from "./user-account/index.js";
import { SoftwareApplication, LinxSoftwareApplication } from "./software-application/index.js";
import { Permission } from "./permission/index.js";
import { Report, LinxReport, REPORT_REASONS, REPORT_STATUSES } from "./report/index.js";
import { Claim, LinxClaim, CLAIM_STATUSES } from "./claim/index.js";
import { Verification } from "./verification/index.js";
import { LinxSystemFields } from "./system.js";

// Generic schemas
export { Entity, Factoid, Source, Suggest, Confidence, Vote, UserAccount, SoftwareApplication, Permission };

// Report, Claim, Verification schemas
export { Report, LinxReport, REPORT_REASONS, REPORT_STATUSES };
export { Claim, LinxClaim, CLAIM_STATUSES };
export { Verification };

// Linx schemas — how Linx stores/tracks things (system-managed fields added)
export { LinxEntity, LinxFactoid, LinxSource, LinxVote, LinxUserAccount, LinxSoftwareApplication, LinxSystemFields };

// Composite input schemas
export { EntityWithAttributes, Register, AuthAs };

export {
    ServiceStation,
    SERVICE_STATION_AMENITY_KEYS,
    OSM_ENTITY_MAP,
    OSM_AMENITY_MAP,
    OSM_PARENT_TAG_MAP,
    OSM_LEISURE_AMENITY_MAP,
    OSM_SKIP_TAGS,
    OSM_BRAND_DEPENDENT,
} from "./service-station/index.js";
export type { ServiceStationAmenityKey } from "./service-station/index.js";

// Activity log schemas
export {
    ActivityLog,
    LinxActivityLog,
    ACTIVITY_ACTIONS,
    ACTIVITY_CATEGORIES,
    ACTOR_TYPES,
    LOG_LEVELS,
} from "./activity-log/index.js";

export { toDbSchema, FactoidDb, UserAccountDb, SoftwareApplicationDb } from "./db.js";

// FactoidMap — keyed collections of factoids sharing the same attribute
export { KEYED_TYPES, isKeyedType, extractCollectionKey, FactoidMapEntry } from "./factoid-map/index.js";
