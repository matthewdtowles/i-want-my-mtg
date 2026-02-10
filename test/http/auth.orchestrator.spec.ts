import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/core/auth/auth.service';
import { EmailService } from 'src/core/email/email.service';
import { PasswordReset } from 'src/core/password-reset/password-reset.entity';
import { PasswordResetService } from 'src/core/password-reset/password-reset.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
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

    const mockPasswordResetService = {
        createResetRequest: jest.fn(),
        findByToken: jest.fn(),
        deleteByToken: jest.fn(),
        deleteExpired: jest.fn(),
    };

    const mockUserService = {
        findByEmail: jest.fn(),
        updatePassword: jest.fn(),
    };

    const mockEmailService = {
        sendPasswordResetEmail: jest.fn(),
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
                {
                    provide: PasswordResetService,
                    useValue: mockPasswordResetService,
                },
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
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

    describe('requestPasswordReset', () => {
        const successMessage =
            'If an account with that email exists, we have sent a password reset link.';

        it('should return success when user exists and email is sent', async () => {
            const coreUser = new User({
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
            });
            const resetRequest = new PasswordReset({
                id: 1,
                email: 'test@example.com',
                resetToken: 'reset-token',
                expiresAt: new Date('2026-02-10'),
            });
            mockUserService.findByEmail.mockResolvedValue(coreUser);
            mockPasswordResetService.createResetRequest.mockResolvedValue(resetRequest);
            mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

            const result = await orchestrator.requestPasswordReset('test@example.com');

            expect(result.success).toBe(true);
            expect(result.message).toBe(successMessage);
            expect(mockPasswordResetService.createResetRequest).toHaveBeenCalledWith(
                'test@example.com'
            );
            expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
                'test@example.com',
                'reset-token'
            );
        });

        it('should return success even when user does not exist', async () => {
            mockUserService.findByEmail.mockResolvedValue(null);

            const result = await orchestrator.requestPasswordReset('nonexistent@example.com');

            expect(result.success).toBe(true);
            expect(result.message).toBe(successMessage);
            expect(mockPasswordResetService.createResetRequest).not.toHaveBeenCalled();
            expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should delete reset request and return success when email fails to send', async () => {
            const coreUser = new User({
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
            });
            const resetRequest = new PasswordReset({
                id: 1,
                email: 'test@example.com',
                resetToken: 'reset-token',
                expiresAt: new Date('2026-02-10'),
            });
            mockUserService.findByEmail.mockResolvedValue(coreUser);
            mockPasswordResetService.createResetRequest.mockResolvedValue(resetRequest);
            mockEmailService.sendPasswordResetEmail.mockResolvedValue(false);

            const result = await orchestrator.requestPasswordReset('test@example.com');

            expect(result.success).toBe(true);
            expect(result.message).toBe(successMessage);
            expect(mockPasswordResetService.deleteByToken).toHaveBeenCalledWith('reset-token');
        });

        it('should return success even when an error is thrown', async () => {
            mockUserService.findByEmail.mockRejectedValue(new Error('Database error'));

            const result = await orchestrator.requestPasswordReset('test@example.com');

            expect(result.success).toBe(true);
            expect(result.message).toBe(successMessage);
        });
    });

    describe('resetPassword', () => {
        it('should reset password and return auth token on success', async () => {
            const resetRequest = new PasswordReset({
                id: 1,
                email: 'test@example.com',
                resetToken: 'valid-token',
                expiresAt: new Date(Date.now() + 3600000),
            });
            const coreUser = new User({
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
            });
            mockPasswordResetService.findByToken.mockResolvedValue(resetRequest);
            mockUserService.findByEmail.mockResolvedValue(coreUser);
            mockUserService.updatePassword.mockResolvedValue(true);
            mockAuthService.login.mockResolvedValue(mockAuthToken);

            const result = await orchestrator.resetPassword('valid-token', 'NewPassword1!');

            expect(result.success).toBe(true);
            expect(result.token).toBe('test-token');
            expect(result.user).toBe(coreUser);
            expect(mockUserService.updatePassword).toHaveBeenCalledWith(coreUser, 'NewPassword1!');
            expect(mockPasswordResetService.deleteByToken).toHaveBeenCalledWith('valid-token');
        });

        it('should return error when token is not found', async () => {
            mockPasswordResetService.findByToken.mockResolvedValue(null);

            const result = await orchestrator.resetPassword('invalid-token', 'NewPassword1!');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid or expired');
        });

        it('should return error and delete token when expired', async () => {
            const expiredReset = new PasswordReset({
                id: 1,
                email: 'test@example.com',
                resetToken: 'expired-token',
                expiresAt: new Date('2020-01-01'),
            });
            mockPasswordResetService.findByToken.mockResolvedValue(expiredReset);

            const result = await orchestrator.resetPassword('expired-token', 'NewPassword1!');

            expect(result.success).toBe(false);
            expect(result.message).toContain('expired');
            expect(mockPasswordResetService.deleteByToken).toHaveBeenCalledWith('expired-token');
        });

        it('should return error when user is not found for email', async () => {
            const resetRequest = new PasswordReset({
                id: 1,
                email: 'deleted@example.com',
                resetToken: 'valid-token',
                expiresAt: new Date(Date.now() + 3600000),
            });
            mockPasswordResetService.findByToken.mockResolvedValue(resetRequest);
            mockUserService.findByEmail.mockResolvedValue(null);

            const result = await orchestrator.resetPassword('valid-token', 'NewPassword1!');

            expect(result.success).toBe(false);
            expect(mockPasswordResetService.deleteByToken).toHaveBeenCalledWith('valid-token');
        });

        it('should return error when an exception is thrown', async () => {
            mockPasswordResetService.findByToken.mockRejectedValue(new Error('Database error'));

            const result = await orchestrator.resetPassword('some-token', 'NewPassword1!');

            expect(result.success).toBe(false);
            expect(result.message).toContain('error occurred');
        });
    });
});
