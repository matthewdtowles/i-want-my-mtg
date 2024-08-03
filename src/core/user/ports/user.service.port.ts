import { User } from "../user";

/**
 * User service
 * Implemented by Core
 * Used by Adapters
 */
export interface UserServicePort {


    /**
     * Return authenticated user by email and password
     * 
     * @param email 
     * @param password 
     */
    authenticate(email: string, password: string): Promise<User>;

    /**
     * Save User if not created
     * Return created User
     * 
     * @param user 
     */
    create(user: User): Promise<User>;

    /**
     * Return User with id
     * 
     * @param id
     */
    findById(id: number): Promise<User>;

    /**
     * Return User with username
     * 
     * @param username 
     */
    findByUsername(username: string): Promise<User>;

    /**
     * Update User that exists
     * Return updated User
     * 
     * @param user 
     */
    update(user: User): Promise<User>;

    /**
     * Delete User with id from all records
     * 
     * @param id
     */
    remove(user: User): Promise<boolean>;
}