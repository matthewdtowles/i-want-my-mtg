import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRepositoryPort } from "src/core/user/ports/user.repository.port";
import { User } from "src/core/user/user";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";

@Injectable()
export class UserRepository implements UserRepositoryPort {
    
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async emailExists(_email: string): Promise<boolean> {
        return await this.userRepository.exists({where:{email: _email}});
    }

    async userExists(user: User): Promise<boolean> {
        return await this.userRepository.exists({ where: { name: user.name } });
    }

    async findByUsername(username: string): Promise<User | null> {
        return await this.userRepository.findOneBy({ name: username });
    }

    async removeById(id: number): Promise<void> {
        await this.userRepository.delete(id);
    }


    async removeUser(user: User): Promise<void> {
        await this.userRepository.delete(user.id);
    }

    async save(user: User): Promise<User> {
        const userEntity = new UserEntity();
        userEntity.id = user.id;
        userEntity.name = user.name;
        userEntity.email = user.email;

        const savedUserEntity = await this.userRepository.save(userEntity);
        return new User(savedUserEntity.id, savedUserEntity.name, savedUserEntity.email);
    }

    async findById(id: number): Promise<User | null> {
        const userEntity = await this.userRepository.findOneBy({ id });
        return userEntity ? new User(userEntity.id, userEntity.name, userEntity.email) : null;
    }

}