import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/core/user/user.entity";
import { UserRepositoryPort } from "src/core/user/user.repository.port";
import { UserMapper } from "src/infrastructure/database/user/user.mapper";
import { UserOrmEntity } from "src/infrastructure/database/user/user.orm-entity";
import { InsertResult, Repository } from "typeorm";

@Injectable()
export class UserRepository implements UserRepositoryPort {

    constructor(@InjectRepository(UserOrmEntity) private readonly userRepository: Repository<UserOrmEntity>) { }

    async create(user: User): Promise<User | null> {
        const ormUser: UserOrmEntity = UserMapper.toOrmEntity(user);
        const existingUser: UserOrmEntity = await this.userRepository.findOneBy({ email: ormUser.email });
        if (existingUser) {
            throw new Error(`User with email ${ormUser.email} already exists.`);
        }
        const userResult: InsertResult = await this.userRepository.insert(ormUser);
        if (!userResult || !userResult.identifiers || userResult.identifiers.length < 1) {
            throw new Error(`Failed to create user: ${ormUser.email}`);
        }
        ormUser.id = userResult.identifiers[0].id;
        return UserMapper.toCore(ormUser);
    }

    async findByEmail(email: string): Promise<User | null> {
        const foundUser: UserOrmEntity = await this.userRepository.findOneBy({ email });
        return foundUser ? UserMapper.toCore(foundUser) : null;
    }

    async findById(id: number): Promise<User | null> {
        const foundUser: UserOrmEntity = await this.userRepository.findOneBy({ id });
        return foundUser ? UserMapper.toCore(foundUser) : null;
    }

    async update(user: User): Promise<User | null> {
        const savedUser: UserOrmEntity = await this.userRepository.save(UserMapper.toOrmEntity(user));
        return savedUser ? UserMapper.toCore(savedUser) : null;
    }

    async delete(id: number): Promise<void> {
        await this.userRepository.delete(id);
    }
}
