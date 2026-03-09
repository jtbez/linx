import type { Infer } from '@vinejs/vine/types'
import type { LinxEntity } from '../schemas/entity/index.js'
import type { LinxFactoid, LinxSource } from '../schemas/factoid/index.js'
import type { LinxUserAccount } from '../schemas/user-account/index.js'
import type { LinxSoftwareApplication } from '../schemas/software-application/index.js'
import type { LinxVote } from '../schemas/vote/index.js'
import type { Permission } from '../schemas/permission/index.js'
import type { LinxActivityLog } from '../schemas/activity-log/index.js'
import type { LinxReport } from '../schemas/report/index.js'
import type { LinxClaim } from '../schemas/claim/index.js'
import type { Verification } from '../schemas/verification/index.js'

/**
 * Mirrors the runtime `flattenConfidence()` in db.ts at the type level:
 * replaces the nested `confidence: { score, calculatedAt }` object with
 * flat `confidenceScore` + `confidenceCalculatedAt` columns.
 */
type FlattenConfidence<T> = Omit<T, 'confidence'> & {
    confidenceScore: number
    confidenceCalculatedAt: Date | null
}

/**
 * Mirrors the runtime `toDbSchema()` relation swap at the type level:
 * removes a nested relation key and adds a UUID foreign-key string column.
 */
type SwapRelationForFk<T, RelKey extends keyof T, FkName extends string> =
    Omit<T, RelKey> & { [K in FkName]: string }

// ---------------------------------------------------------------------------
// Column types — derived from the Linx VineJS source schemas so they stay
// DRY. Each type mirrors the runtime DB schema transformation (flattenConfidence,
// toDbSchema) expressed purely at the TypeScript level.
// ---------------------------------------------------------------------------

export type EntityColumns = Infer<typeof LinxEntity>

export type FactoidColumns = FlattenConfidence<
    SwapRelationForFk<Infer<typeof LinxFactoid>, 'source', 'sourceId'>
>

export type SourceColumns = Infer<typeof LinxSource>

export type UserAccountColumns = FlattenConfidence<Infer<typeof LinxUserAccount>>

export type SoftwareApplicationColumns = FlattenConfidence<Infer<typeof LinxSoftwareApplication>>

export type VoteColumns = Infer<typeof LinxVote>

export type PermissionColumns = Infer<typeof Permission>

export type ActivityLogColumns = Infer<typeof LinxActivityLog>

export type ReportColumns = Infer<typeof LinxReport>

export type ClaimColumns = Infer<typeof LinxClaim>

export type VerificationColumns = Infer<typeof Verification>
