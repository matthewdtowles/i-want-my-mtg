import { Inject, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { User } from "src/core/user/user.entity";
import { CreateUserDto, UpdateUserDto, UserDto } from "./api/user.dto";
import { UserRepositoryPort } from "./api/user.repository.port";
import { UserServicePort } from "./api/user.service.port";
import { UserMapper } from "./user.mapper";

@Injectable()
export class UserService implements UserServicePort {

    private readonly LOGGER = new Logger(UserService.name);

    constructor(
        @Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort,
        @Inject(UserMapper) private readonly mapper: UserMapper,
    ) { }

    async create(userDto: CreateUserDto): Promise<UserDto | null> {
        this.LOGGER.debug(`create`);
        const user: User = this.mapper.createDtoToEntity(userDto);
        user.password = await this.encrypt(userDto.password);
        const savedUser: User = (await this.repository.create(user)) ?? new User();
        return savedUser ? this.mapper.entityToDto(savedUser) : null;
    }

    async findById(id: number): Promise<UserDto | null> {
        this.LOGGER.debug(`findById ${id}`);
        const user: User = await this.repository.findById(id);
        this.LOGGER.debug(`findById user ${JSON.stringify(user)}`);
        return user ? this.mapper.entityToDto(user) : null;
    }

    async findByEmail(email: string): Promise<UserDto | null> {
        this.LOGGER.debug(`findByEmail ${email}`);
        const user: User = await this.repository.findByEmail(email);
        return user ? this.mapper.entityToDto(user) : null;
    }

    async findSavedPassword(email: string): Promise<string | null> {
        this.LOGGER.debug(`findSavedPassword ${email}`);
        const user: User = await this.repository.findByEmail(email);
        return user ? user.password : null;
    }

    async update(userDto: UpdateUserDto): Promise<UserDto | null> {
        this.LOGGER.debug(`update`);
        const user: User = this.mapper.updateDtoToEntity(userDto);
        const savedUser: User = await this.repository.update(user) ?? new User();
        this.LOGGER.debug(`update savedUser ${JSON.stringify(savedUser)}`);
        return user ? this.mapper.entityToDto(savedUser) : null;
    }

    async updatePassword(userId: number, password: string): Promise<boolean> {
        return false;
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
