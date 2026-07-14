import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from 'src/core/auth/auth.service';
import { AuthToken } from 'src/core/auth/auth.types';
import { RefreshTokenService } from 'src/core/auth/refresh-token.service';
import { User } from 'src/core/user/user.entity';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';
import { UserService } from 'src/core/user/user.service';
import { UserRole } from 'src/shared/constants/user.role.enum';

const mockUser: User = {
    id: 1,
    email: 'test@test.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: UserRole.User,
};

describe('AuthService', () => {
    let authService: AuthService;
    let userService: UserService;
    let jwtService: JwtService;
    let refreshTokenService: jest.Mocked<Pick<RefreshTokenService, 'issue' | 'rotate' | 'revoke'>>;

    beforeAll(async () => {
        refreshTokenService = {
            issue: jest.fn().mockResolvedValue('refresh-raw'),
            rotate: jest.fn(),
            revoke: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserService,
                    useValue: {
                        findByEmail: jest.fn().mockResolvedValue(mockUser),
                        findById: jest.fn().mockResolvedValue(mockUser),
                        findSavedPassword: jest.fn().mockResolvedValue(mockUser.email),
                    },
                },
                {
                    provide: UserRepositoryPort,
                    useValue: {
                        findByEmail: jest.fn().mockResolvedValue(mockUser),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: jest.fn().mockResolvedValue('jwtToken'),
                    },
                },
                {
                    provide: RefreshTokenService,
                    useValue: refreshTokenService,
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userService = module.get<UserService>(UserService);
        jwtService = module.get<JwtService>(JwtService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateUser', () => {
        it('should return User if the email and password are valid', async () => {
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
            const result = await authService.validateUser(mockUser.email, 'password');
            expect(bcrypt.compare).toHaveBeenCalledWith('password', mockUser.email);
            expect(userService.findByEmail).toHaveBeenCalledWith(mockUser.email);
            expect(result).toEqual(mockUser);
        });

        it('should return null if the email or password is invalid', async () => {
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

            const result = await authService.validateUser(mockUser.email, 'wrong-password');
            expect(result).toBeNull();
        });

        it('still runs a bcrypt compare for an unknown email (no timing oracle, B10)', async () => {
            (userService.findSavedPassword as jest.Mock).mockResolvedValueOnce(null);
            const compareSpy = jest
                .spyOn(bcrypt, 'compare')
                .mockResolvedValue(false as never);

            const result = await authService.validateUser('nobody@nowhere.com', 'whatever');

            expect(result).toBeNull();
            expect(compareSpy).toHaveBeenCalledTimes(1);
            expect(userService.findByEmail).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should return an access token', async () => {
            const expectedToken: AuthToken = { access_token: 'jwtToken' };

            const result = await authService.login(mockUser);
            expect(jwtService.signAsync).toHaveBeenCalledWith({
                email: mockUser.email,
                sub: mockUser.id.toString(),
                role: mockUser.role,
            });
            expect(result).toEqual(expectedToken);
        });
    });

    describe('loginWithRefresh', () => {
        it('returns an access token plus a freshly issued refresh token', async () => {
            const result = await authService.loginWithRefresh(mockUser, 'iPhone');
            expect(refreshTokenService.issue).toHaveBeenCalledWith(mockUser.id, 'iPhone');
            expect(result).toEqual({ accessToken: 'jwtToken', refreshToken: 'refresh-raw' });
        });
    });

    describe('refresh', () => {
        it('rotates a valid refresh token into a new token pair', async () => {
            refreshTokenService.rotate.mockResolvedValueOnce({
                userId: mockUser.id,
                rawToken: 'rotated-raw',
            });
            const result = await authService.refresh('old-raw');
            expect(refreshTokenService.rotate).toHaveBeenCalledWith('old-raw');
            expect(userService.findById).toHaveBeenCalledWith(mockUser.id);
            expect(result).toEqual({ accessToken: 'jwtToken', refreshToken: 'rotated-raw' });
        });

        it('returns null when the refresh token is invalid', async () => {
            refreshTokenService.rotate.mockResolvedValueOnce(null);
            const result = await authService.refresh('bad-raw');
            expect(result).toBeNull();
        });

        it('revokes the new token and returns null when the owner is gone', async () => {
            refreshTokenService.rotate.mockResolvedValueOnce({
                userId: 999,
                rawToken: 'orphan-raw',
            });
            (userService.findById as jest.Mock).mockResolvedValueOnce(null);
            const result = await authService.refresh('old-raw');
            expect(refreshTokenService.revoke).toHaveBeenCalledWith('orphan-raw');
            expect(result).toBeNull();
        });
    });

    describe('logout', () => {
        it('revokes the supplied refresh token', async () => {
            await authService.logout('some-raw');
            expect(refreshTokenService.revoke).toHaveBeenCalledWith('some-raw');
        });
    });
});
