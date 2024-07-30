import { Repository } from "typeorm";
import { User } from "../user.entity";

/**
 * Persistence layer for User entity
 */
export class UserRepository extends Repository<User> {

    /**
     * Create user entity, update if entity exists
     * 
     * @param user
     * @returns created|updated user
     */
    async saveUser(user: User): Promise<User> {
        return await this.save(user);
    }

    /**
     * @param user 
     * @returns true if user entity exists, false otherwise
     */
    async userExists(user: User): Promise<boolean> {
        return await this.exists({ where: { username: user.username }});
    }

    /**
     * @param id
     * @returns user entity with id, null if not found
     */
    async findById(id: number): Promise<User | null> {
        return await this.findOneBy({ id: id });
    }

    /**
     * @param username
     * @returns user entity with username, null if not found
     */
    async findByUsername(username: string): Promise<User | null> {
        return await this.findOneBy({ username: username });
    }

    /**
     * Remove user entity with id
     * 
     * @param id
     */
    async removeById(id: number): Promise <void> {
        await this.delete(id);
    }

    /**
     * Remove user entity
     * 
     * @param user
     */
    async removeUser(user: User): Promise<void> {
        await this.delete(user.id);
    }
}