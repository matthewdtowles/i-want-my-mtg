import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';
import { Repository } from 'typeorm';
import { User } from '../../core/user/user.entity';


@Injectable()
export class UserRepository implements UserRepositoryPort {
    
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async save(user: User, hashedPassword: string): Promise<User | null> {
        const userEntity = new User();
        userEntity.id = user.id;
        userEntity.name = user.name;
        userEntity.email = user.email;
        userEntity.password = hashedPassword;
        return await this.userRepository.save(userEntity);
    }

    async findByEmail(_email: string): Promise<User | null> {
        return await this.userRepository.findOneBy({ email: _email });
    }

    async findById(id: number): Promise<User | null> {
        return await this.userRepository.findOneBy({ id });
    }

    async getPasswordHash(email: string): Promise<string> {
        const userEntity = await this.userRepository.findOneBy({ email });
        return userEntity ? userEntity.password : null;
    }

    async delete(user: User): Promise<void> {
        await this.userRepository.delete(user.id);
    }
}