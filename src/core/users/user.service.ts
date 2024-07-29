import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from '../../http/user/dtos/create-user.dto';
import { UserServicePort } from './ports/user.service.port';

@Injectable()
export class UserService implements UserServicePort{
    constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>,) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        const user = new User();
        user.email = createUserDto.email;
        user.username = createUserDto.username;
        user.password = createUserDto.password;
        return this.usersRepository.save(user);
    }

    async findById(idIn: number): Promise<User> {
        return this.usersRepository.findOneBy({ id: idIn });
    }

    async findByUsername(usernameIn: string): Promise<User> {
        return this.usersRepository.findOneBy({ username: usernameIn });
    }

    async update(user: User): Promise<User> {
        throw new Error('Method not implemented.');
    }

    async remove(user: User): Promise<boolean> {
        await this.usersRepository.delete(user);
        return !this.usersRepository.exists({ where: { username: user.username } });
    }
}