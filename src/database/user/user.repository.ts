import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';
import { User } from 'src/core/user/user';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UserRepository implements UserRepositoryPort {
    
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) {}

    async emailExists(_email: string): Promise<boolean> {
        return await this.userRepository.exists({where:{email: _email}});
    }
    
    async findById(id: number): Promise<User | null> {
        const userEntity = await this.userRepository.findOneBy({ id });
        return userEntity ? new User(userEntity.id, userEntity.name, userEntity.email) : null;
    }

    async findByEmail(username: string): Promise<User | null> {
        const userEntity: UserEntity =  await this.userRepository.findOneBy({ name: username });
        return userEntity ? new User(userEntity.id, userEntity.name, userEntity.email) : null;
    }

    async getPasswordHash(email: string): Promise<string> {
        const userEntity = await this.userRepository.findOneBy({ email });
        return userEntity ? userEntity.password : null;
    }

    async userExists(user: User): Promise<boolean> {
        return await this.userRepository.exists({ where: { name: user.name } });
    }

    async removeById(id: number): Promise<void> {
        await this.userRepository.delete(id);
    }

    async removeUser(user: User): Promise<void> {
        await this.userRepository.delete(user.id);
    }

    async save(user: User, hashedPassword: string): Promise<User> {
        const userEntity = new UserEntity();
        userEntity.id = user.id;
        userEntity.name = user.name;
        userEntity.email = user.email;
        userEntity.password = hashedPassword;
        const savedUserEntity = await this.userRepository.save(userEntity);
        return new User(savedUserEntity.id, savedUserEntity.name, savedUserEntity.email);
    }
}