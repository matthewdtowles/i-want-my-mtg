import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserServicePort } from './ports/user.service.port';
import { UserRepositoryPort } from './ports/user.repository.port';
import { User } from './user';

@Injectable()
export class UserService implements UserServicePort {

    constructor(@Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort) {}

    async authenticate(email: string, password: string): Promise<User | null> {
        const hashedPassword: string = await this.repository.getPasswordHash(email);
        let authedUser: User;
        if (hashedPassword && await bcrypt.compare(password, hashedPassword)) {
            authedUser = await this.repository.findByEmail(email);
        }
        return authedUser;
    }

    async createUser(name: string, email: string, password: string): Promise<User> {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User(null, name, email);
        return this.repository.save(user, hashedPassword);
    }

    async findById(id: number): Promise<User> {
        return this.repository.findById(id);
    }

    async findByEmail(username: string): Promise<User> {
        return this.repository.findByEmail(username);
    }

    async update(user: User, password: string): Promise<User> {
        return this.repository.save(user, password);
    }

    async remove(id: number): Promise<void> {
        await this.repository.removeById(id);
    }
}