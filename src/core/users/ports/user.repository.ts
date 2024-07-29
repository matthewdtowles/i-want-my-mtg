import { Repository } from "typeorm";
import { User } from "../user.entity";
import { InjectRepository } from "@nestjs/typeorm";

export class UserRepository {

    constructor(
        @InjectRepository(User) private readonly repository: Repository<User>
    ) {}

    /**
     * Create user entity, update if entity exists
     * 
     * @param user
     * @returns Create/Updated user
     */
    async saveUser(user: User): Promise<User> {
        return await this.repository.save(user);
    }

    /**
     * Return true if user entity exists, false otherwise
     * 
     * @param user 
     * @returns 
     */
    async userExists(user: User): Promise<boolean> {
        return await this.repository.exists({ where: { username: user.username }});
    }

    /**
     * Return user entity with id, null if not found
     * 
     * @param id
     * @returns 
     */
    async findById(id: number): Promise<User | null> {
        return await this.repository.findOneBy({ id: id });
    }

    /**
     * Return user entity with username, null if not found
     * 
     * @param username
     * @returns 
     */
    async findByUsername(username: string): Promise<User | null> {
        return await this.repository.findOneBy({ username: username });
    }

    /**
     * Remove user entity with id
     * 
     * @param id
     */
    async removeById(id: number): Promise <void> {
        await this.repository.delete(id);
    }

    /**
     * Remove user entity
     * 
     * @param user
     */
    async removeUser(user: User): Promise<void> {
        await this.repository.delete(user.id);
    }
}