import type { Contract } from "../types/index.js";
import type { Infer } from '@vinejs/vine/types';
import { UserAccount as UserAccountInputSchema, LinxUserAccount as LinxUserAccountSchema } from "../schemas/user-account/index.js";

export default interface UserAccount extends Contract {
  /**
   * The Linx stored representation schema (with system fields).
   */
  Schema: typeof LinxUserAccountSchema;

  /**
   * Full user account data type (as stored by Linx).
   */
  Data: UserAccountData;

  /**
   * Input type — inferred directly from the generic UserAccount schema.
   * No Omit needed: the generic schema IS the input.
   */
  Input: UserAccountInput;

  /**
   * UserAccount data with extra methods.
   */
  Hydrated: UserAccountData & UserAccountHydrations;
}

/**
 * Full stored data, inferred from the LinxUserAccount schema.
 */
type UserAccountData = Infer<typeof LinxUserAccountSchema>;

/**
 * Input data, inferred from the generic UserAccount schema.
 * The generic schema only contains user-provided fields — no system fields to omit.
 */
type UserAccountInput = Infer<typeof UserAccountInputSchema>;

/**
 * Methods and properties used to hydrate and interact with a UserAccount.
 */
type UserAccountHydrations = {
  /**
   * Returns the linked Person or Organisation Entity.
   */
  getEntity: () => Promise<unknown>;

  /**
   * Returns all Factoids created by this UserAccount.
   */
  getFactoids: () => Promise<unknown[]>;

  /**
   * Returns the cached confidence metadata (score and calculatedAt).
   */
  getConfidence: () => { score: number; calculatedAt: Date | null };
}
