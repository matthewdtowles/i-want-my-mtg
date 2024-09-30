import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserDto } from '../user/dto/user.dto';
import { UserRepositoryPort } from '../user/ports/user.repository.port';
import { UserServicePort } from '../user/ports/user.service.port';
import { User } from '../user/user.entity';
import { AuthToken, JwtPayload } from './auth.types';
import { AuthServicePort } from './ports/auth.service.port';

@Injectable()
export class AuthService implements AuthServicePort {

    constructor(
        @Inject(UserServicePort) private readonly userService: UserServicePort,
        @Inject(UserRepositoryPort) private readonly userRepository: UserRepositoryPort,
        @Inject(JwtService) private readonly jwtService: JwtService,
    ) {}

    async validateCredentials(email: string, password: string): Promise<UserDto | null> {
        const user: User = await this.userRepository.findByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            return await this.userService.findByEmail(email);
        }
        return null;
    }

    // TODO: should this be async?
    async login(user: UserDto): Promise<AuthToken> {
        const payload: JwtPayload = {
            email: user.email,
            sub: user.id.toString(),
        }
        const authToken: AuthToken = {
            access_token: await this.jwtService.signAsync(payload)
        }
        return authToken;
    }

}