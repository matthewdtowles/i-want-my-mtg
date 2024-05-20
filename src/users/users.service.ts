import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>,) {}

    create(createUserDto: CreateUserDto): Promise<User> {
        const user = new User();
        user.username = createUserDto.username;
        return this.usersRepository.save(user);
    }

    findById(idIn: number): Promise<User> {
        return this.usersRepository.findOneBy({ id: idIn });
    }

    findByUsername(usernameIn: string): Promise<User> {
        return this.usersRepository.findOneBy({ username: usernameIn });
    }

    async remove(id: number): Promise<void> {
        await this.usersRepository.delete(id);
    }
}