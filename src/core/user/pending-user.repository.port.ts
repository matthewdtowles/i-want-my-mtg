import { PendingUser } from './pending-user.entity';

export const PendingUserRepositoryPort = 'PendingUserRepositoryPort';

/**
 * Persistence layer for PendingUser entity
 */
export interface PendingUserRepositoryPort {
    /**
     * Create pending user entity
     *
     * @param pendingUser
     * @returns created pending user
     */
    create(pendingUser: PendingUser): Promise<PendingUser>;

    /**
     * @param token verification token
     * @returns pending user with token, null if not found
     */
    findByToken(token: string): Promise<PendingUser | null>;

    /**
     * @param email
     * @returns pending user with email, null if not found
     */
    findByEmail(email: string): Promise<PendingUser | null>;

    /**
     * Remove pending user with verification token
     *
     * @param token
     */
    deleteByToken(token: string): Promise<void>;

    /**
     * Remove pending user with email
     *
     * @param email
     */
    deleteByEmail(email: string): Promise<void>;

    /**
     * Remove all expired pending users
     *
     * @returns number of deleted records
     */
    deleteExpired(): Promise<number>;
}
