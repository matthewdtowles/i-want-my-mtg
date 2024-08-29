import { Inject, Injectable } from '@nestjs/common';
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
    ) {}


    async createUser(userDto: CreateUserDto): Promise<UserDto> {
        const user: User = await this.repository.save(this.mapper.writeDtoToEntity(userDto));
        return this.mapper.entityToDto(user);
    }

    async findById(id: number): Promise<UserDto> {
        return this.mapper.entityToDto(await this.repository.findById(id));
    }

    async findByEmail(username: string): Promise<UserDto> {
        return this.mapper.entityToDto(await this.repository.findByEmail(username));
    }

    async update(userDto: UpdateUserDto): Promise<UserDto> {
        const user: User = this.mapper.writeDtoToEntity(userDto);
        return this.mapper.entityToDto(await this.repository.save(user));
    }

    async remove(userDto: UpdateUserDto): Promise<void> {
        const user: User = this.mapper.writeDtoToEntity(userDto);
        await this.repository.delete(user);
    }
}