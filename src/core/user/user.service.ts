import { Inject, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { User, UserRepositoryPort } from "src/core/user";


@Injectable()
export class UserService {

    private readonly LOGGER = new Logger(UserService.name);

    constructor(@Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort) { }

    async create(user: User): Promise<User | null> {
        this.LOGGER.debug(`create`);
        // user.password = await this.encrypt(user.password);
        return (await this.repository.create(user)) ?? new User();
    }

    async findById(id: number): Promise<User | null> {
        return await this.repository.findById(id);
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.repository.findByEmail(email);
    }

    async findSavedPassword(email: string): Promise<string | null> {
        this.LOGGER.debug(`findSavedPassword ${email}`);
        const user: User = await this.repository.findByEmail(email);
        return user ? user.password : null;
    }

    async update(user: User): Promise<User | null> {
        this.LOGGER.debug(`update`);
        return await this.repository.update(user) ?? new User();
    }

    async updatePassword(userId: number, password: string): Promise<boolean> {
        this.LOGGER.debug(`updatePassword userId:${userId}, pwd:${password}`);
        const user: User = new User();
        user.id = userId;
        user.password = await this.encrypt(password);
        this.LOGGER.debug(`Input user ${JSON.stringify(user)}`);
        return !!await this.repository.update(user);
    }

    async remove(id: number): Promise<void> {
        this.LOGGER.debug(`remove ${id}`);
        await this.repository.delete(id);
    }

    private async encrypt(password: string): Promise<string> {
        this.LOGGER.debug(`encrypt password`);
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }
}
