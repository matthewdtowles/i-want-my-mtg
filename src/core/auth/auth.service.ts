import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { getLogger } from 'src/logger/global-app-logger';
import { AuthToken, AuthTokenPair, JwtPayload } from './auth.types';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
    private readonly LOGGER = getLogger(AuthService.name);

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(JwtService) private readonly jwtService: JwtService,
        @Inject(RefreshTokenService) private readonly refreshTokenService: RefreshTokenService
    ) {}

    async validateUser(email: string, password: string): Promise<User | null> {
        this.LOGGER.debug(`Attempt to authenticate ${email}.`);
        const encPwd: string = await this.userService.findSavedPassword(email);
        let user: User = null;
        if (encPwd && (await bcrypt.compare(password, encPwd))) {
            user = await this.userService.findByEmail(email);
            this.LOGGER.debug(`Authenticated user ${user.id}.`);
        } else {
            this.LOGGER.warn(`Authentication failed for ${email}.`);
        }
        return user;
    }

    async login(user: User): Promise<AuthToken> {
        this.LOGGER.debug(`Logging in user ${user?.id}.`);
        if (!user) {
            throw new Error(`Login failure. User not found.`);
        }
        if (!user.id) {
            throw new Error(`Login failure. User ID not found.`);
        }
        const payload: JwtPayload = {
            email: user.email,
            sub: user.id.toString(),
            role: user.role,
        };
        const authToken: AuthToken = {
            access_token: await this.jwtService.signAsync(payload),
        };
        this.LOGGER.debug(`Login successful for user ${user.id}.`);
        return authToken;
    }

    /**
     * Log in and also mint a refresh token. Used by the API/mobile login flow
     * (the cookie-based web flow keeps using {@link login}).
     */
    async loginWithRefresh(user: User, deviceLabel?: string | null): Promise<AuthTokenPair> {
        const { access_token } = await this.login(user);
        const refreshToken = await this.refreshTokenService.issue(user.id, deviceLabel);
        return { accessToken: access_token, refreshToken };
    }

    /**
     * Exchange a refresh token for a new access token, rotating the refresh
     * token. Returns null when the refresh token is unknown, revoked, expired,
     * or its owning user no longer exists.
     */
    async refresh(rawRefreshToken: string): Promise<AuthTokenPair | null> {
        const rotated = await this.refreshTokenService.rotate(rawRefreshToken);
        if (!rotated) {
            return null;
        }
        const user = await this.userService.findById(rotated.userId);
        if (!user) {
            // Owner vanished between rotation and lookup; revoke the fresh token.
            await this.refreshTokenService.revoke(rotated.rawToken);
            return null;
        }
        const { access_token } = await this.login(user);
        return { accessToken: access_token, refreshToken: rotated.rawToken };
    }

    /** Revoke a refresh token on sign-out. */
    async logout(rawRefreshToken: string): Promise<void> {
        await this.refreshTokenService.revoke(rawRefreshToken);
    }
}
