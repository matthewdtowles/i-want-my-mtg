import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserServicePort } from './ports/user.service.port';
import { UserRepositoryPort } from './ports/user.repository.port';

@Injectable()
export class UserService implements UserServicePort {

    constructor(@InjectRepository(UserRepositoryPort) private readonly repository: UserRepositoryPort) {}

    async create(user: User): Promise<User> {
        return this.repository.saveUser(user);
    }

    async findById(id: number): Promise<User> {
        return this.repository.findById(id);
    }

    async findByUsername(username: string): Promise<User> {
        return this.repository.findByUsername(username);
    }

    async update(user: User): Promise<User> {
        return this.repository.saveUser(user);
    }

    async remove(user: User): Promise<boolean> {
        await this.repository.removeUser(user);
        return !this.repository.userExists(user);
    }
}