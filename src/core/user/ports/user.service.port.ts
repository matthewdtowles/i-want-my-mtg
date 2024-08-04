import { User } from "../user";

/**
 * User service
 * Implemented by Core
 * Used by Adapters
 */
export interface UserServicePort {

    /**
     * @param email 
     * @param password
     * @returns authenticated User with email and password, otherwise null
     */
    authenticate(email: string, password: string): Promise<User | null>;

    /**
     * Create and save user
     * 
     * @param name
     * @param email
     * @param password
     * @returns created User
    */
    createUser(name: string, email: string, password: string): Promise<User>;

    /**
     * @param username
     * @returns User with email
     */
    findByEmail(email: string): Promise<User>;

    /**
     * @param id
     * @returns User with id
     */
    findById(id: number): Promise<User>;

    /**
     * Update User that exists
     * 
     * @param user 
     * @param password
     * @returns updated User, if authenticated
     */
    update(user: User, password: string): Promise<User>;

    /**
     * Delete User with id from all records
     * 
     * @param id
     */
    remove(user: User): Promise<boolean>;
}