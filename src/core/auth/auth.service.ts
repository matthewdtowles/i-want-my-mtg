import { Injectable } from '@nestjs/common';
import { AuthServicePort } from './ports/auth.service.port';
import { UserDto } from '../user/dto/user.dto';
import { AuthToken } from './auth.types';

@Injectable()
export class AuthService implements AuthServicePort {
    validateCredentials(username: string, password: string): Promise<UserDto | null> {
        throw new Error('Method not implemented.');
    }
    login(user: UserDto): Promise<AuthToken> {
        throw new Error('Method not implemented.');
    }

}