import { User } from "../user";

export const UserRepositoryPort = 'UserRepositoryPort';

/**
 * Persistence layer for User entity
 */
export interface UserRepositoryPort {

    /**
     * @param email
     * @returns true if user with email exists, false otherwise
     */
    emailExists(email: string): Promise<boolean>;

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
     * @param email
     * @returns hashed password for user with email 
     */
    getPasswordHash(email: string): Promise<string>;

    /**
     * Remove user entity with id
     * 
     * @param id
     */
    removeById(id: number): Promise<void>;

    /**
     * Remove user entity
     * 
     * @param user
     */
    removeUser(user: User): Promise<void>;

    /**
     * Create user entity, update if entity exists
     * Authenticate with hashedPassword
     * 
     * @param user
     * @param hashedPassword
     * @returns created|updated user if authenticated
     */
    save(user: User, hashedPassword: string): Promise<User>;

    /**
     * @param user 
     * @returns true if user entity exists, false otherwise
     */
    userExists(user: User): Promise<boolean>;
}