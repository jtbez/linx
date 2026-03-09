import type { Contract } from "../types/index.js";
import type { Infer } from '@vinejs/vine/types';
import {
  SoftwareApplication as SoftwareApplicationInputSchema,
  LinxSoftwareApplication as LinxSoftwareApplicationSchema,
} from "../schemas/software-application/index.js";

export default interface SoftwareApplication extends Contract {
  /**
   * The Linx stored representation schema (with system fields).
   */
  Schema: typeof LinxSoftwareApplicationSchema;

  /**
   * Full software application data type (as stored by Linx).
   */
  Data: SoftwareApplicationData;

  /**
   * Input type — inferred directly from the generic SoftwareApplication schema.
   * No Omit needed: the generic schema IS the input.
   */
  Input: SoftwareApplicationInput;

  /**
   * SoftwareApplication data with extra methods.
   */
  Hydrated: SoftwareApplicationData & SoftwareApplicationHydrations;
}

/**
 * Full stored data, inferred from the LinxSoftwareApplication schema.
 */
type SoftwareApplicationData = Infer<typeof LinxSoftwareApplicationSchema>;

/**
 * Input data, inferred from the generic SoftwareApplication schema.
 * The generic schema only contains user-provided fields — no system fields to omit.
 */
type SoftwareApplicationInput = Infer<typeof SoftwareApplicationInputSchema>;

/**
 * Methods and properties used to hydrate and interact with a SoftwareApplication.
 */
type SoftwareApplicationHydrations = {
  /**
   * Returns the linked SoftwareApplication Entity.
   */
  getEntity: () => Promise<unknown>;

  /**
   * Returns the owning Organisation's UserAccount.
   */
  getOrganisation: () => Promise<unknown>;

  /**
   * Returns the cached confidence metadata (score and calculatedAt).
   */
  getConfidence: () => { score: number; calculatedAt: Date | null };
}
