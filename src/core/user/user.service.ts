import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserServicePort } from './ports/user.service.port';
import { UserRepositoryPort } from './ports/user.repository.port';
import { User } from './user';

@Injectable()
export class UserService implements UserServicePort {

    constructor(@InjectRepository(UserRepositoryPort) private readonly repository: UserRepositoryPort) {}

    authenticate(email: string, password: string): Promise<User> {
        const hashedPassword = await this.repository.getPasswordHash(email);
    }

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