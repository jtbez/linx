import vine from "@vinejs/vine";
import { Confidence } from "../confidence/index.js"
import { LinxSystemFields } from "../system.js"

/**
 * UserAccount — generic authentication credentials.
 *
 * This is the canonical definition of what a user account IS: an email
 * and password pair. It serves as the base user input for authentication.
 *
 * The Linx-specific variant (LinxUserAccount) extends this with
 * system-managed fields: entity association, email verification, confidence.
 *
 * @property email - Email address used for authentication.
 * @property password - Password (hashed before storage, never serialized in responses).
 */
export const UserAccount = vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
});

/**
 * LinxUserAccount — the Linx platform's stored representation of a UserAccount.
 *
 * A UserAccount IS an Entity (Person or Organization) with auth capabilities.
 * The entityId references the underlying Schema.org entity whose properties
 * are stored as Factoids.
 *
 * @property id - System-assigned unique identifier (UUID).
 * @property entityId - FK to the Person or Organisation Entity this account represents.
 * @property emailVerified - Whether the account's email address has been verified.
 * @property confidence - Cached confidence metadata. Score is a rolling average
 *   computed from raw vote data on the account's Factoids, email verification
 *   status, and account type.
 */
export const LinxUserAccount = vine.object({
    ...UserAccount.getProperties(),
    ...LinxSystemFields.getProperties(),
    entityId: vine.string().uuid(),
    emailVerified: vine.boolean(),
    confidence: Confidence,
});

/**
 * Register — cross-cutting input for user registration.
 *
 * Creates a UserAccount + Entity + optional Name factoid in one operation.
 * Extends the generic UserAccount with the entity type and optional name.
 *
 * @property accountType - The type of Entity to create (Person or Organization).
 * @property name - Optional display name, stored as the entity's first factoid.
 */
export const Register = vine.object({
    ...UserAccount.getProperties(),
    accountType: vine.enum(['Person', 'Organization']),
    name: vine.string().optional(),
});

/**
 * AuthAs — input for scoping a session to a specific user account.
 *
 * @property userAccountId - UUID of the UserAccount to act as, or omit for app-only mode.
 * @property publicKey - JWK-encoded public key for DPoP proof-of-possession binding.
 *   When provided, the session token is bound to this key and all requests must
 *   include a valid DPoP proof signed with the corresponding private key.
 */
export const AuthAs = vine.object({
    userAccountId: vine.string().uuid().optional(),
    publicKey: vine.any().optional(),
});
