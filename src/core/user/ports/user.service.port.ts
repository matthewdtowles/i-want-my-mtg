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
    create(user: CreateUserDto): Promise<UserDto>;

    /**
     * @param username
     * @returns User with email
     */
    findByEmail(email: string): Promise<UserDto>;

    /**
     * @param id
     * @returns User with id
     */
    findById(id: number): Promise<UserDto>;

    /**
     * Update User that exists
     * 
     * @param user 
     * @param password
     * @returns updated User, if authenticated
     */
    update(user: UpdateUserDto): Promise<UserDto>;

    /**
     * Delete User with id from all records
     * 
     * @param id
     */
    remove(id: number): Promise<void>;
}