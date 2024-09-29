import { Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { User } from 'src/core/user/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserRepositoryPort } from './ports/user.repository.port';
import { UserServicePort } from './ports/user.service.port';

@Injectable()
export class UserService implements UserServicePort {

    constructor(
        @Inject(UserRepositoryPort) private readonly repository: UserRepositoryPort,
    ) { }


    async create(userDto: CreateUserDto): Promise<UserDto> {
        const user: User = plainToInstance(User, userDto);
        user.password = userDto.password;
        const savedUser: User = await this.repository.create(user) ?? new User();
        return plainToInstance(UserDto, savedUser);
    }

    async findById(id: number): Promise<UserDto> {
        const user: User = await this.repository.findById(id) ?? new User();
        return plainToInstance(UserDto, user);
    }

    async findByEmail(username: string): Promise<UserDto> {
        const user: User = await this.repository.findByEmail(username) ?? new User();
        return plainToInstance(UserDto, user);
    }

    async update(userDto: UpdateUserDto): Promise<UserDto> {
        const user: User = plainToInstance(User, userDto);
        user.password = userDto.password;
        const savedUser: User = await this.repository.update(user) ?? new User();
        return plainToInstance(UserDto, savedUser);
    }

    async remove(id: number): Promise<void> {
        await this.repository.delete(id);
    }
}