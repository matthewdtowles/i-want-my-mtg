import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserDto } from '../dto/user.dto';

export const UserServicePort = 'UserServicePort';

/**
 * User service
 * Implemented by Core
 * Used by Adapters
 */
export interface UserServicePort {

    /**
     * Create and save user
     * 
     * @param name
     * @param email
     * @param password
     * @returns created User
    */
    create(user: CreateUserDto): Promise<UserDto | null>;

    /**
     * @param username
     * @returns User with email
     */
    findByEmail(email: string): Promise<UserDto | null>;

    /**
     * @param id
     * @returns User with id
     */
    findById(id: number): Promise<UserDto | null>;

    /**
     * Finds the saved password for user with email
     * 
     * @param email
     * @returns saved password for user with email
     */
    findSavedPassword(email: string): Promise<string | null>;

    /**
     * Update User that exists
     * 
     * @param user 
     * @param password
     * @returns updated User, if authenticated
     */
    update(user: UpdateUserDto): Promise<UserDto | null>;

    /**
     * Delete User with id from all records
     * 
     * @param id
     */
    remove(id: number): Promise<void>;
}