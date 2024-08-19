import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserServicePort } from './ports/user.service.port';
import { UserRepositoryPort } from './ports/user.repository.port';
import { User } from 'src/core/user/user.entity';

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

    async createUser(_name: string, _email: string, _password: string): Promise<User> {
        const hashedPassword = await bcrypt.hash(_password, 10);
        const user = new User();
        user.name = _name;
        user.email = _email;
        user.password = hashedPassword; // TODO: fix this inconsistency
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

    async remove(user: User): Promise<void> {
        await this.repository.delete(user);
    }
}