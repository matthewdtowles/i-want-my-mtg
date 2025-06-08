import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { InsertResult, Repository } from "typeorm";
import { UserOrmEntity } from "src/infrastructure/database/user/user.orm-entity";

@Injectable()
export class UserRepository implements UserRepositoryPort {

    constructor(@InjectRepository(UserOrmEntity) private readonly userRepository: Repository<UserOrmEntity>) { }

    async create(user: UserOrmEntity): Promise<UserOrmEntity | null> {
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
        return savedUserOrmEntity;
    }

    async findByEmail(email: string): Promise<UserOrmEntity | null> {
        return await this.userRepository.findOneBy({ email });
    }

    async findById(id: number): Promise<UserOrmEntity | null> {
        return await this.userRepository.findOneBy({ id });
    }

    async update(user: UserOrmEntity): Promise<UserOrmEntity> {
        return await this.userRepository.save(user);
    }

    async delete(id: number): Promise<void> {
        await this.userRepository.delete(id);
    }
}
