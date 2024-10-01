import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from 'src/core/user/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserRepositoryPort } from './ports/user.repository.port';
import { UserServicePort } from './ports/user.service.port';
import { UserMapper } from './user.mapper';


@Injectable()
export class UserService implements UserServicePort {

    constructor(
        @Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort,
        @Inject(UserMapper) private readonly mapper: UserMapper,
    ) { }

    async create(userDto: CreateUserDto): Promise<UserDto> {
        const user: User = this.mapper.createDtoToEntity(userDto);
        user.password = await this.encrypt(userDto.password);
        const savedUser: User = await this.repository.create(user) ?? new User();
        return this.mapper.entityToDto(savedUser);
    }

    async findById(id: number): Promise<UserDto> {
        const user: User = await this.repository.findById(id) ?? new User();
        return this.mapper.entityToDto(user);
    }

    async findByEmail(email: string): Promise<UserDto> {
        const user: User = await this.repository.findByEmail(email) ?? new User();
        return this.mapper.entityToDto(user);
    }

    async update(userDto: UpdateUserDto): Promise<UserDto> {
        const user: User = this.mapper.updateDtoToEntity(userDto);
        user.password = userDto.password;
        const savedUser: User = await this.repository.update(user) ?? new User();
        return this.mapper.entityToDto(savedUser);
    }

    async remove(id: number): Promise<void> {
        await this.repository.delete(id);
    }

    private async encrypt(password: string): Promise<string> {
        const saltRounds = 10; // TODO: check best practices
        return await bcrypt.hash(password, saltRounds);
    }
}