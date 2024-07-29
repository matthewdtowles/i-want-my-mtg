import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserServicePort } from './ports/user.service.port';
import { UserRepository } from './ports/user.repository';

@Injectable()
export class UserService implements UserServicePort {

    constructor(@InjectRepository(User) private readonly userRepository: UserRepository) {}

    async create(user: User): Promise<User> {
        return this.userRepository.saveUser(user);
    }

    async findById(id: number): Promise<User> {
        return this.userRepository.findById(id);
    }

    async findByUsername(username: string): Promise<User> {
        return this.userRepository.findByUsername(username);
    }

    async update(user: User): Promise<User> {
        return this.userRepository.saveUser(user);
    }

    async remove(user: User): Promise<boolean> {
        await this.userRepository.removeUser(user);
        return !this.userRepository.userExists(user);
    }
}