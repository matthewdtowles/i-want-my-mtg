import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';
import { InsertResult, Repository } from 'typeorm';
import { User } from '../../core/user/user.entity';


@Injectable()
export class UserRepository implements UserRepositoryPort {
    
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) { }

    async create(user: User): Promise<User | null> {
        const userResult: InsertResult = await this.userRepository.insert(user);
        if (userResult.raw.affectedRows === 0) {
            return null;
        }
        const savedUser: User = {
            id: userResult.identifiers[0].id,
            email: userResult.generatedMaps[0].email,
            name: userResult.generatedMaps[0].name,
            inventory: userResult.generatedMaps[0].inventory,
        };
        return savedUser;
    }

    async findByEmail(_email: string): Promise<User | null> {
        return await this.userRepository.findOneBy({ email: _email });
    }

    async findById(id: number): Promise<User | null> {
        return await this.userRepository.findOneBy({ id });
    }

    async update(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }

    async delete(user: User): Promise<void> {
        await this.userRepository.delete(user.id);
    }
}