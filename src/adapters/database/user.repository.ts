import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { User } from "src/core/user/user.entity";
import { InsertResult, Repository } from "typeorm";

@Injectable()
export class UserRepository implements UserRepositoryPort {

    private readonly LOGGER: Logger = new Logger(UserRepository.name);

    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) { }

    async create(user: User): Promise<User | null> {
        this.LOGGER.debug(`Create user`);
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
        this.LOGGER.debug(`findByEmail ${_email}`);
        return await this.userRepository.findOneBy({ email: _email });
    }

    async findById(id: number): Promise<User | null> {
        this.LOGGER.debug(`findById ${id}`);
        return await this.userRepository.findOneBy({ id });
    }

    async update(user: User): Promise<User> {
        this.LOGGER.debug(`update ${user.id}`);
        return await this.userRepository.save(user);
    }

    async delete(id: number): Promise<void> {
        this.LOGGER.debug(`delete ${id}`);
        await this.userRepository.delete(id);
    }
}
