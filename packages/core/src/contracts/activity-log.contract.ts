import type { Contract } from "../types/index.js";
import type { Infer } from '@vinejs/vine/types';
import { ActivityLog as ActivityLogQuerySchema, LinxActivityLog as LinxActivityLogSchema } from "../schemas/activity-log/index.js";

export default interface ActivityLogContract extends Contract {
    /**
     * The Linx stored representation schema (with system fields).
     */
    Schema: typeof LinxActivityLogSchema;

    /**
     * Full activity log data type (as stored by Linx).
     */
    Data: ActivityLogData;

    /**
     * Input type — query filters for listing activity logs.
     */
    Input: ActivityLogInput;
}

/**
 * Full stored data, inferred from the LinxActivityLog schema.
 */
type ActivityLogData = Infer<typeof LinxActivityLogSchema>;

/**
 * Query filter input, inferred from the ActivityLog query schema.
 */
type ActivityLogInput = Infer<typeof ActivityLogQuerySchema>;
