import { Inject, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { User } from "src/core/user/user.entity";
import { CreateUserDto, UpdateUserDto } from "../../adapters/http/user/user.dto";
import { UserRepositoryPort } from "./user.repository.port";
import { UserMapper } from "./user.mapper";

@Injectable()
export class UserService {

    private readonly LOGGER = new Logger(UserService.name);

    constructor(
        @Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort,
        @Inject(UserMapper) private readonly mapper: UserMapper,
    ) { }

    async create(userDto: CreateUserDto): Promise<User | null> {
        this.LOGGER.debug(`create`);
        const user: User = this.mapper.createDtoToEntity(userDto);
        user.password = await this.encrypt(userDto.password);
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

    async update(userDto: UpdateUserDto): Promise<User | null> {
        this.LOGGER.debug(`update`);
        const user: User = this.mapper.updateDtoToEntity(userDto);
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
