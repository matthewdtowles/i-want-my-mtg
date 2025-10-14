import { Inject, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { User } from "./user.entity";
import { UserRepositoryPort } from "./user.repository.port";


@Injectable()
export class UserService {

    private readonly LOGGER = new Logger(UserService.name);

    constructor(@Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort) { }

    async create(userIn: User): Promise<User | null> {
        this.LOGGER.debug(`create`);
        const user: User = new User({
            ...userIn,
            password: await this.encrypt(userIn.password),
        });
        return await this.repository.create(user);
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
        if (user.password) {
            throw new Error("Password must be updated separately.");
        }
        return await this.repository.update(user) ?? null;
    }

    async updatePassword(userIn: User, newPassword: string): Promise<boolean> {
        this.LOGGER.debug(`updatePassword userId:${userIn.id}, pwd:${newPassword}`);
        const user: User = new User({
            ...userIn,
            password: await this.encrypt(newPassword),
        });
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
