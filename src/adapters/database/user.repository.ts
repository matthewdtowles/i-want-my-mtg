import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { User } from "src/core/user/user.entity";
import { InsertResult, Repository } from "typeorm";

@Injectable()
export class UserRepository implements UserRepositoryPort {
    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) { }

    async create(user: User): Promise<User | null> {
        const userResult: InsertResult = await this.userRepository.insert(user);
        if (!userResult || !userResult.raw || userResult.raw.affectedRows < 1) {
            return null;
        }
        const savedUser: User = {
            id: userResult.identifiers[0].id,
            email: userResult.generatedMaps[0].email,
            name: userResult.generatedMaps[0].name,
            password: userResult.generatedMaps[0].password,
            role: userResult.generatedMaps[0].role,
        };
        return savedUser;
    }

    async findByEmail(_email: string): Promise<User | null> {
        return await this.userRepository.findOneBy({ email: _email });
    }

    async findById(id: number): Promise<User | null> {
        return await this.userRepository.findOneBy({ id });
    }

    async update(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }

    async delete(id: number): Promise<void> {
        await this.userRepository.delete(id);
    }
}
