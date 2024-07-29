import { User } from '../user.entity';

/**
 * User service
 * Implemented by Core
 * Used by Adapters
 */
export interface UserServicePort {

    /**
     * Save User if not saved
     * Return true if created, false otherwise
     * 
     * @param user 
     */
    create(user: User): Promise<boolean>;

    /**
     * Returns User with given username
     * 
     * @param username 
     */
    findByUsername(username: string): Promise<User>;

    /**
     * Returns User with given id
     * 
     * @param id
     */
    findById(id: string): Promise<User>;

    findBy
}