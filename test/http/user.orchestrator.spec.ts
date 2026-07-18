import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/core/auth/auth.service';
import { SignupService } from 'src/core/user/signup.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { ActionStatus } from 'src/http/base/action-status.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BaseViewDto } from 'src/http/base/base.view.dto';
import { Toast } from 'src/http/base/toast';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { CreateUserRequestDto } from 'src/http/hbs/user/dto/create-user.request.dto';
import { UpdateUserRequestDto } from 'src/http/hbs/user/dto/update-user.request.dto';
import { UserResponseDto } from 'src/http/hbs/user/dto/user.response.dto';
import { UserViewDto } from 'src/http/hbs/user/dto/user.view.dto';
import { UserOrchestrator } from 'src/http/hbs/user/user.orchestrator';
import { UserRole } from 'src/shared/constants/user.role.enum';

jest.mock('src/http/http.error.handler');

describe('UserOrchestrator', () => {
    let orchestrator: UserOrchestrator;
    let userService: jest.Mocked<UserService>;

    const mockUserService = {
        create: jest.fn(),
        createWithHashedPassword: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
        update: jest.fn(),
        updatePassword: jest.fn(),
        remove: jest.fn(),
    };

    const mockAuthService = {
        login: jest.fn(),
    };

    const mockSignupService = {
        initiateSignup: jest.fn(),
        verifyEmail: jest.fn(),
    };

    const mockHttpErrorHandler = {
        validateAuthenticatedRequest: jest.fn(),
        toHttpException: jest.fn(),
    };

    const mockAuthenticatedRequest = {
        user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: UserRole.User,
        },
        isAuthenticated: () => true,
        query: {},
    } as AuthenticatedRequest;

    const mockUserResponseDto: UserResponseDto = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'User',
    };

    const mockCreateUserDto: CreateUserRequestDto = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserOrchestrator,
                { provide: UserService, useValue: mockUserService },
                { provide: AuthService, useValue: mockAuthService },
                { provide: SignupService, useValue: mockSignupService },
            ],
        }).compile();

        orchestrator = module.get<UserOrchestrator>(UserOrchestrator);
        userService = module.get(UserService);

        (HttpErrorHandler.validateAuthenticatedRequest as jest.Mock) =
            mockHttpErrorHandler.validateAuthenticatedRequest;
        (HttpErrorHandler.toHttpException as unknown as jest.Mock) =
            mockHttpErrorHandler.toHttpException;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initiateSignup', () => {
        it('delegates to SignupService and returns the uniform acknowledgement', async () => {
            mockSignupService.initiateSignup.mockResolvedValue(undefined);

            const result = await orchestrator.initiateSignup(mockCreateUserDto);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Please check your email to verify your account');
            expect(mockSignupService.initiateSignup).toHaveBeenCalledWith(
                'new@example.com',
                'New User',
                'password123'
            );
        });

        it('propagates a genuine signup error (e.g. email send failure)', async () => {
            mockSignupService.initiateSignup.mockRejectedValue(
                new Error('Failed to send verification email')
            );

            await expect(orchestrator.initiateSignup(mockCreateUserDto)).rejects.toThrow(
                'Failed to send verification email'
            );
        });
    });

    describe('verifyEmail', () => {
        it('issues a web session token from the verified user on success', async () => {
            const mockUser = new User({ id: 1, email: 'new@example.com', name: 'New User' });
            mockSignupService.verifyEmail.mockResolvedValue({
                success: true,
                message: 'Email verified successfully! Welcome to I Want My MTG.',
                user: mockUser,
            });
            mockAuthService.login.mockResolvedValue({ access_token: 'jwt-token', expires_in: 3600 });

            const result = await orchestrator.verifyEmail('validtoken');

            expect(result.success).toBe(true);
            expect(result.token).toBe('jwt-token');
            expect(result.user).toEqual(mockUser);
            expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
        });

        it('returns a failure result without issuing a token when verification fails', async () => {
            mockSignupService.verifyEmail.mockResolvedValue({
                success: false,
                message: 'Invalid or expired verification link',
            });

            const result = await orchestrator.verifyEmail('invalidtoken');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid or expired verification link');
            expect(result.token).toBeUndefined();
            expect(mockAuthService.login).not.toHaveBeenCalled();
        });
    });

    describe('findUser', () => {
        beforeEach(() =>
            mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => {})
        );

        it('should return user view with user data', async () => {
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);

            const result: UserViewDto = await orchestrator.findUser(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.user).toEqual(mockUserResponseDto);
            expect(result.toast).toBeUndefined();
            expect(userService.findById).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
            expect(HttpErrorHandler.validateAuthenticatedRequest).toHaveBeenCalledWith(
                mockAuthenticatedRequest
            );
        });

        it('should include login message when query params indicate login', async () => {
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);
            const loginRequest = {
                ...mockAuthenticatedRequest,
                query: {
                    status: HttpStatus.OK.toString(),
                    action: 'login',
                },
            } as unknown as AuthenticatedRequest;

            const result: UserViewDto = await orchestrator.findUser(loginRequest);

            expect(result.toast).toBeUndefined();
        });

        it('should handle validation errors', async () => {
            const validationError = new Error('Invalid request');
            mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => {
                throw validationError;
            });
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw validationError;
            });

            await expect(orchestrator.findUser(mockAuthenticatedRequest)).rejects.toThrow(
                'Invalid request'
            );
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                validationError,
                'findUser'
            );
        });
    });

    describe('updateUser', () => {
        beforeEach(() =>
            mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => {})
        );

        it('should update user and return success view', async () => {
            const updatedUserDto = {
                ...mockUserResponseDto,
                name: 'Updated Name',
                email: 'updated@example.com',
            };
            mockUserService.update.mockResolvedValue(updatedUserDto);
            const mockUpdateUserDto: UpdateUserRequestDto = {
                name: 'Updated Name',
                email: 'updated@example.com',
            };

            const result: UserViewDto = await orchestrator.updateUser(
                mockUpdateUserDto,
                mockAuthenticatedRequest
            );

            expect(result).toBeDefined();
            expect(result.toast).toEqual(
                new Toast('User Updated Name updated successfully', ActionStatus.SUCCESS)
            );
            expect(result.user).toEqual(updatedUserDto);
            expect(userService.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockAuthenticatedRequest.user.id,
                    name: mockUpdateUserDto.name,
                    email: mockUpdateUserDto.email,
                })
            );
        });

        it('should handle update errors', async () => {
            const updateError = new Error('Update failed');
            mockUserService.update.mockRejectedValue(updateError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw updateError;
            });
            const mockUpdateUserDto: UpdateUserRequestDto = {
                name: 'Updated Name',
                email: 'updated@example.com',
            };

            await expect(
                orchestrator.updateUser(mockUpdateUserDto, mockAuthenticatedRequest)
            ).rejects.toThrow('Update failed');
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(updateError, 'findUser');
        });
    });

    describe('updatePassword', () => {
        beforeEach(() =>
            mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => {})
        );

        it('should update password and return success view', async () => {
            mockUserService.updatePassword.mockResolvedValue(true);

            const result: BaseViewDto = await orchestrator.updatePassword(
                'newPassword123',
                mockAuthenticatedRequest
            );

            expect(result).toBeDefined();
            expect(result.toast).toEqual(new Toast('Password updated', ActionStatus.SUCCESS));
            expect(userService.updatePassword).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockAuthenticatedRequest.user.id,
                    email: mockAuthenticatedRequest.user.email,
                    name: mockAuthenticatedRequest.user.name,
                    role: mockAuthenticatedRequest.user.role,
                }),
                'newPassword123'
            );
        });

        it('should return error view if password update fails', async () => {
            mockUserService.updatePassword.mockResolvedValue(false);

            const result: BaseViewDto = await orchestrator.updatePassword(
                'badPassword',
                mockAuthenticatedRequest
            );

            expect(result.toast).toEqual(new Toast('Error updating password', ActionStatus.ERROR));
        });

        it('should handle password update errors', async () => {
            const passwordError = new Error('Password update failed');
            mockUserService.updatePassword.mockRejectedValue(passwordError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw passwordError;
            });

            await expect(
                orchestrator.updatePassword('newPassword', mockAuthenticatedRequest)
            ).rejects.toThrow('Password update failed');
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                passwordError,
                'updatePassword'
            );
        });
    });

    describe('deleteUser', () => {
        beforeEach(() =>
            mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => {})
        );

        it('should delete user and return success view', async () => {
            mockUserService.remove.mockResolvedValue(undefined);
            mockUserService.findById.mockResolvedValue(null);

            const result: BaseViewDto = await orchestrator.deleteUser(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.toast).toEqual(
                new Toast('User deleted successfully', ActionStatus.SUCCESS)
            );
            expect(result.authenticated).toBe(false);
            expect(userService.remove).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
            expect(userService.findById).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
        });

        it('should throw error if user still exists after deletion', async () => {
            mockUserService.remove.mockResolvedValue(undefined);
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);
            const deleteError = new Error('Could not delete user');
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw deleteError;
            });

            await expect(orchestrator.deleteUser(mockAuthenticatedRequest)).rejects.toThrow(
                'Could not delete user'
            );
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                deleteError,
                'deleteUser'
            );
        });

        it('should handle deletion service errors', async () => {
            const serviceError = new Error('Database error');
            mockUserService.remove.mockRejectedValue(serviceError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw serviceError;
            });

            await expect(orchestrator.deleteUser(mockAuthenticatedRequest)).rejects.toThrow(
                'Database error'
            );
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                serviceError,
                'deleteUser'
            );
        });
    });
});
