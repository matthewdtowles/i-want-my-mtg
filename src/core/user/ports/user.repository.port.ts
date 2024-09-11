import { User } from 'src/core/user/user.entity';

export const UserRepositoryPort = 'UserRepositoryPort';

/**
 * Persistence layer for User entity
 */
export interface UserRepositoryPort {

    /**
     * Create user entity if it does not exist
     * 
     * @param user
     * @returns created user, null otherwise
     */
    create(user: User): Promise<User | null>;

    /**
     * Create user entity, update if entity exists
     * 
     * @deprecated
     * @param user
     * @returns created|updated user if authenticated
     */
    save(user: User): Promise<User | null>;

    /**
     * @param email
     * @returns user entity with email, null if not found
     */
    findByEmail(email: string): Promise<User | null>;

    /**
     * @param id
     * @returns user entity with id, null if not found
     */
    findById(id: number): Promise<User | null>;

    /**
     * Update user entity if it exists
     * 
     * @param user
     * @returns updated user
     */
    update(user: User): Promise<User>;

    /**
     * Remove user entity
     * 
     * @param user
     */
    delete(user: User): Promise<void>;
}