import { User } from "../user";

/**
 * Persistence layer for User entity
 */
export interface UserRepositoryPort {

    /**
     * Create user entity, update if entity exists
     * 
     * @param user
     * @returns created|updated user
     */
    save(user: User): Promise<User>;

    /**
     * @param email
     * @returns true if user with email exists, false otherwise
     */
    emailExists(email: string): Promise<boolean>;

    /**
     * @param user 
     * @returns true if user entity exists, false otherwise
     */
    userExists(user: User): Promise<boolean>; 


    /**
     * @param id
     * @returns user entity with id, null if not found
     */
    findById(id: number): Promise<User | null>;
    
    /**
     * @param username
     * @returns user entity with username, null if not found
     */
    findByUsername(username: string): Promise<User | null>;
 

    /**
     * Remove user entity with id
     * 
     * @param id
     */
    removeById(id: number): Promise <void>; 
    
    /**
     * Remove user entity
     * 
     * @param user
     */
    removeUser(user: User): Promise<void>;
}