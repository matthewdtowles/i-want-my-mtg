import { User } from 'src/core/user/user.entity';

export const UserRepositoryPort = 'UserRepositoryPort';

/**
 * Persistence layer for User entity
 */
export interface UserRepositoryPort {

    /**
     * Create user entity, update if entity exists
     * Authenticate with hashedPassword
     * 
     * @param user
     * @param hashedPassword
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
     * Remove user entity
     * 
     * @param user
     */
    delete(user: User): Promise<void>;
}