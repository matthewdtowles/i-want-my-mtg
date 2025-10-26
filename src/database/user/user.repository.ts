import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/core/user/user.entity";
import { UserRepositoryPort } from "src/core/user/user.repository.port";
import { getLogger } from "src/logger/global-app-logger";
import { InsertResult, Repository } from "typeorm";
import { UserMapper } from "./user.mapper";
import { UserOrmEntity } from "./user.orm-entity";

@Injectable()
export class UserRepository implements UserRepositoryPort {

    private readonly LOGGER = getLogger(UserRepository.name);

    constructor(@InjectRepository(UserOrmEntity) private readonly userRepository: Repository<UserOrmEntity>) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async create(user: User): Promise<User | null> {
        const email = user?.email;
        this.LOGGER.debug(`Creating user with email: ${email}.`);
        const ormUser: UserOrmEntity = UserMapper.toOrmEntity(user);
        const existingUser: UserOrmEntity = await this.userRepository.findOneBy({ email: ormUser.email });
        if (existingUser) {
            const msg = `User with email ${ormUser.email} already exists.`;
            this.LOGGER.debug(msg);
            throw new Error(msg);
        }
        const userResult: InsertResult = await this.userRepository.insert(ormUser);
        if (!userResult || !userResult.identifiers || userResult.identifiers.length < 1) {
            const msg = `Failed to create user: ${ormUser.email}.`;
            this.LOGGER.debug(msg);
            throw new Error(msg);
        }
        ormUser.id = userResult.identifiers[0].id;
        this.LOGGER.debug(`User created with id: ${ormUser.id}`);
        return UserMapper.toCore(ormUser);
    }

    async findByEmail(email: string): Promise<User | null> {
        this.LOGGER.debug(`Finding user by email: ${email}.`);
        const foundUser: UserOrmEntity = await this.userRepository.findOneBy({ email });
        this.LOGGER.debug(`User ${foundUser ? "found" : "not found"} for email: ${email}.`);
        return foundUser ? UserMapper.toCore(foundUser) : null;
    }

    async findById(id: number): Promise<User | null> {
        this.LOGGER.debug(`Finding user by id: ${id}.`);
        const foundUser: UserOrmEntity = await this.userRepository.findOneBy({ id });
        this.LOGGER.debug(`User ${foundUser ? "found" : "not found"} for id: ${id}.`);
        return foundUser ? UserMapper.toCore(foundUser) : null;
    }

    async update(user: User): Promise<User | null> {
        this.LOGGER.debug(`Updating user with id: ${user.id}.`);
        const savedUser: UserOrmEntity = await this.userRepository.save(UserMapper.toOrmEntity(user));
        this.LOGGER.debug(`User ${savedUser ? "updated" : "not updated"} with id: ${user.id}.`);
        return savedUser ? UserMapper.toCore(savedUser) : null;
    }

    async delete(id: number): Promise<void> {
        this.LOGGER.debug(`Deleting user with id: ${id}.`);
        await this.userRepository.delete(id);
        this.LOGGER.debug(`User deleted with id: ${id}.`);
    }
}
