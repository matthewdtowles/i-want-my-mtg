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

    async create(user: UserOrmEntity): Promise<User | null> {
        const userResult: InsertResult = await this.userRepository.insert(user);
        if (!userResult || !userResult.raw || userResult.raw.affectedRows < 1) {
            return null;
        }
        const savedUserOrmEntity: UserOrmEntity = {
            id: userResult.identifiers[0].id,
            email: userResult.generatedMaps[0].email,
            name: userResult.generatedMaps[0].name,
            password: userResult.generatedMaps[0].password,
            role: userResult.generatedMaps[0].role,
        };
        return UserMapper.toCore(savedUserOrmEntity);
    }

    async findByEmail(email: string): Promise<User | null> {
        const foundUser: UserOrmEntity = await this.userRepository.findOneBy({ email });
        return foundUser ? UserMapper.toCore(foundUser) : null;
    }

    async findById(id: number): Promise<User | null> {
        const foundUser: UserOrmEntity = await this.userRepository.findOneBy({ id });
        return foundUser ? UserMapper.toCore(foundUser) : null;
    }

    async update(user: UserOrmEntity): Promise<User | null> {
        const savedUser: UserOrmEntity = await this.userRepository.save(user);
        return savedUser ? UserMapper.toCore(savedUser) : null;
    }

    async delete(id: number): Promise<void> {
        await this.userRepository.delete(id);
    }
}
