import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/core/auth/auth.service';
import { AuthOrchestrator } from 'src/http/auth/auth.orchestrator';
import { AuthResult } from 'src/http/auth/dto/auth.result';
import { UserResponseDto } from 'src/http/user/dto/user.response.dto';
import { AppLogger } from 'src/logger/app-logger';

describe('AuthOrchestrator', () => {
    let orchestrator: AuthOrchestrator;
    let authService: AuthService;

    const mockAuthService = {
        login: jest.fn(),
    };

    const mockUser: UserResponseDto = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'User',
    };

    const mockAuthToken = {
        access_token: 'test-token',
        expires_in: 3600,
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthOrchestrator,
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        module.useLogger(new AppLogger());
        orchestrator = module.get<AuthOrchestrator>(AuthOrchestrator);
        authService = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should return successful AuthResult when login succeeds', async () => {
            mockAuthService.login.mockResolvedValue(mockAuthToken);

            const result: AuthResult = await orchestrator.login(mockUser);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.token).toBe(mockAuthToken.access_token);
            expect(result.statusCode).toBe(HttpStatus.OK);
            expect(result.redirectTo).toBe(`/user?action=login&status=${HttpStatus.OK}`);

            expect(authService.login).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockUser.id,
                    name: mockUser.name,
                    email: mockUser.email,
                })
            );
        });

        it('should return failed AuthResult when login fails', async () => {
            mockAuthService.login.mockRejectedValue(new Error('Login failed'));

            const result: AuthResult = await orchestrator.login(mockUser);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.token).toBeUndefined();
            expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
            expect(result.redirectTo).toBe(
                `/login?action=login&status=${HttpStatus.UNAUTHORIZED}&message=Authentication%20failed`
            );
            expect(result.error).toBe('Login failed');
        });

        it('should return failed AuthResult when user is invalid', async () => {
            const result: AuthResult = await orchestrator.login(null);

            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
            expect(authService.login).not.toHaveBeenCalled();
        });

        it('should return failed AuthResult when token is not generated', async () => {
            mockAuthService.login.mockResolvedValue({ access_token: null });

            const result: AuthResult = await orchestrator.login(mockUser);

            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        });
    });

    describe('logout', () => {
        it('should return successful AuthResult for logout', async () => {
            const result: AuthResult = await orchestrator.logout();

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(HttpStatus.OK);
            expect(result.redirectTo).toBe(
                `/?action=logout&status=${HttpStatus.OK}&message=Logged%20out`
            );
        });

        it('should return failed AuthResult if logout throws an error', async () => {
            const loggerSpy = jest
                .spyOn((orchestrator as any).LOGGER, 'debug')
                .mockImplementationOnce(() => {
                    throw new Error('Logout failed');
                });
            const result: AuthResult = await orchestrator.logout();

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(result.redirectTo).toBe(
                `/?action=logout&status=${HttpStatus.INTERNAL_SERVER_ERROR}&message=Logout%20failed`
            );
            expect(result.error).toBe('Logout failed');

            loggerSpy.mockRestore();
        });
    });
});
