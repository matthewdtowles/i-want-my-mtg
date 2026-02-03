import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { getLogger } from 'src/logger/global-app-logger';
import { User } from './user.entity';
import { UserRepositoryPort } from './user.repository.port';

@Injectable()
export class UserService {
    private readonly LOGGER = getLogger(UserService.name);

    constructor(@Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort) {}

    async create(userIn: User): Promise<User | null> {
        this.LOGGER.debug(`Create user ${userIn?.email}.`);
        const user: User = new User({
            ...userIn,
            password: await this.encrypt(userIn.password),
        });
        return await this.repository.create(user);
    }

    async createWithHashedPassword(user: User): Promise<User> {
        // Skip password hashing since it's already hashed
        return await this.repository.create(user);
    }

    async findById(id: number): Promise<User | null> {
        this.LOGGER.debug(`Find user ID ${id}.`);
        return await this.repository.findById(id);
    }

    async findByEmail(email: string): Promise<User | null> {
        this.LOGGER.debug(`Find user with email ${email}.`);
        return await this.repository.findByEmail(email);
    }

    async findSavedPassword(email: string): Promise<string | null> {
        this.LOGGER.debug(`Find saved password for email ${email}.`);
        const user: User = await this.repository.findByEmail(email);
        return user ? user.password : null;
    }

    async update(user: User): Promise<User | null> {
        this.LOGGER.debug(`Update user ID ${user?.id}.`);
        if (user.password) {
            throw new Error('Password must be updated separately.');
        }
        return (await this.repository.update(user)) ?? null;
    }

    async updatePassword(userIn: User, newPassword: string): Promise<boolean> {
        this.LOGGER.debug(`Update password user ${userIn.id}, pwd XXXXXXXX.`);
        const user: User = new User({
            ...userIn,
            password: await this.encrypt(newPassword),
        });
        return !!(await this.repository.update(user));
    }

    async remove(id: number): Promise<void> {
        this.LOGGER.debug(`Remove user ${id}.`);
        await this.repository.delete(id);
    }

    private async encrypt(password: string): Promise<string> {
        this.LOGGER.debug(`Encrypt password.`);
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
}
