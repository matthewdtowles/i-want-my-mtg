import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { instanceToPlain, plainToInstance } from 'class-transformer';
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
        user.password = await this.encrypt(userDto.password);
        const savedUser: User = await this.repository.create(user) ?? new User();
        return plainToInstance(UserDto, savedUser);
    }

    async findById(id: number): Promise<UserDto> {
        const user: User = await this.repository.findById(id) ?? new User();
        return plainToInstance(UserDto, instanceToPlain(user));
    }

    async findByEmail(email: string): Promise<UserDto> {
        const user: User = await this.repository.findByEmail(email) ?? new User();
        const dto: UserDto = plainToInstance(UserDto, instanceToPlain(user));
        return dto;
    }

    async update(userDto: UpdateUserDto): Promise<UserDto> {
        const user: User = plainToInstance(User, userDto) as User;
        user.password = userDto.password;
        const savedUser: User = await this.repository.update(user) ?? new User();
        return plainToInstance(UserDto, savedUser);
    }

    async remove(id: number): Promise<void> {
        await this.repository.delete(id);
    }

    private async encrypt(password: string): Promise<string> {
        const saltRounds = 10; // TODO: check best practices
        return await bcrypt.hash(password, saltRounds);
    }
}