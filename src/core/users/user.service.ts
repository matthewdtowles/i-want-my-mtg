import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from '../../http/user/create-user.dto';

@Injectable()
export class UserService {
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

    async remove(id: number): Promise<void> {
        await this.usersRepository.delete(id);
    }
}