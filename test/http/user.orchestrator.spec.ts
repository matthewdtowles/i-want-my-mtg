import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { BaseViewDto } from "src/http/base/base.view.dto";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { CreateUserRequestDto } from "src/http/user/dto/create-user.request.dto";
import { UpdateUserRequestDto } from "src/http/user/dto/update-user.request.dto";
import { UserResponseDto } from "src/http/user/dto/user.response.dto";
import { UserViewDto } from "src/http/user/dto/user.view.dto";
import { UserOrchestrator } from "src/http/user/user.orchestrator";
import { AuthService } from "src/core/auth/auth.service";
import { User } from "src/core/user/user.entity";
import { UserService } from "src/core/user/user.service";
import { UserRole } from "src/shared/constants/user.role.enum";

jest.mock("src/http/http.error.handler");

describe("UserOrchestrator", () => {
    let orchestrator: UserOrchestrator;
    let userService: UserService;
    let authService: AuthService;

    const mockUserService = {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        updatePassword: jest.fn(),
        remove: jest.fn(),
    };

    const mockAuthService = {
        login: jest.fn(),
    };

    const mockHttpErrorHandler = {
        validateAuthenticatedRequest: jest.fn(),
        toHttpException: jest.fn(),
    };

    const mockAuthenticatedRequest = {
        user: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
            role: UserRole.User,
        },
        isAuthenticated: () => true,
        query: {},
    } as AuthenticatedRequest;

    const mockUserResponseDto: UserResponseDto = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "User",
    };

    const mockCreateUserDto: CreateUserRequestDto = {
        name: "New User",
        email: "new@example.com",
        password: "password123",
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserOrchestrator,
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        orchestrator = module.get<UserOrchestrator>(UserOrchestrator);
        userService = module.get<UserService>(UserService);
        authService = module.get<AuthService>(AuthService);

        // Setup HttpErrorHandler mock
        (HttpErrorHandler.validateAuthenticatedRequest as jest.Mock) = mockHttpErrorHandler.validateAuthenticatedRequest;
        (HttpErrorHandler.toHttpException as unknown as jest.Mock) = mockHttpErrorHandler.toHttpException;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("create", () => {
        it("should create user and return auth token", async () => {
            const mockUser = new User({ id: 1, name: "New User", email: "new@example.com" });
            const mockToken = { access_token: "test-token", expires_in: 3600 };
            mockUserService.create.mockResolvedValue(mockUser);
            mockAuthService.login.mockResolvedValue(mockToken);

            const result = await orchestrator.create(mockCreateUserDto);

            expect(result).toEqual(mockToken);
            expect(userService.create).toHaveBeenCalledWith(expect.any(User));
            expect(authService.login).toHaveBeenCalledWith(mockUser);
        });

        it("should throw error if user creation fails", async () => {
            mockUserService.create.mockResolvedValue(null);
            const error = new Error("User creation failed");
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw error;
            });

            await expect(orchestrator.create(mockCreateUserDto)).rejects.toThrow("User creation failed");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(error, "create");
        });

        it("should throw error if token generation fails after successful creation", async () => {
            mockUserService.create.mockResolvedValue(new User({
                id: 1,
                name: "New User",
                email: "useremail@email.com",
                password: "P4ssw0rd!",
                role: UserRole.User
            }));
            mockAuthService.login.mockResolvedValue({ access_token: null });
            const error = new Error("Authentication token generation failed");
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw error;
            });

            await expect(orchestrator.create(mockCreateUserDto)).rejects.toThrow("Authentication token generation failed");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(error, "create");
        });

        it("should handle and rethrow service errors", async () => {
            const serviceError = new Error("Database connection failed");
            mockUserService.create.mockRejectedValue(serviceError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw serviceError;
            });

            await expect(orchestrator.create(mockCreateUserDto)).rejects.toThrow("Database connection failed");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(serviceError, "create");
        });
    });

    describe("findUser", () => {
        beforeEach(() => mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => { }));

        it("should return user view with user data", async () => {
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);

            const result: UserViewDto = await orchestrator.findUser(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.user).toEqual(mockUserResponseDto);
            expect(result.message).toBeNull();
            expect(result.status).toBe(ActionStatus.NONE);
            expect(userService.findById).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
            expect(HttpErrorHandler.validateAuthenticatedRequest).toHaveBeenCalledWith(mockAuthenticatedRequest);
        });

        it("should include login message when query params indicate login", async () => {
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);
            const loginRequest = {
                ...mockAuthenticatedRequest,
                query: {
                    status: HttpStatus.OK.toString(),
                    action: "login",
                },
            } as unknown as AuthenticatedRequest;

            const result: UserViewDto = await orchestrator.findUser(loginRequest);

            expect(result.message).toBe("Test User - logged in");
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("should handle validation errors", async () => {
            const validationError = new Error("Invalid request");
            mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => {
                throw validationError;
            });
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw validationError;
            });

            await expect(orchestrator.findUser(mockAuthenticatedRequest)).rejects.toThrow("Invalid request");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(validationError, "findUser");
        });
    });

    describe("updateUser", () => {
        beforeEach(() => mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => { }));

        it("should update user and return success view", async () => {
            const updatedUserDto = {
                ...mockUserResponseDto,
                name: "Updated Name",
                email: "updated@example.com",
            };
            mockUserService.update.mockResolvedValue(updatedUserDto);
            const mockUpdateUserDto: UpdateUserRequestDto = {
                name: "Updated Name",
                email: "updated@example.com",
            };

            const result: UserViewDto = await orchestrator.updateUser(mockUpdateUserDto, mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(result.message).toBe("User Updated Name updated successfully");
            expect(result.user).toEqual(updatedUserDto);
            expect(userService.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockAuthenticatedRequest.user.id,
                    name: mockUpdateUserDto.name,
                    email: mockUpdateUserDto.email,
                })
            );
        });

        it("should handle update errors", async () => {
            const updateError = new Error("Update failed");
            mockUserService.update.mockRejectedValue(updateError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw updateError;
            });
            const mockUpdateUserDto: UpdateUserRequestDto = {
                name: "Updated Name",
                email: "updated@example.com",
            };

            await expect(orchestrator.updateUser(mockUpdateUserDto, mockAuthenticatedRequest)).rejects.toThrow("Update failed");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(updateError, "findUser");
        });
    });

    describe("updatePassword", () => {
        beforeEach(() => mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => { }));

        it("should update password and return success view", async () => {
            mockUserService.updatePassword.mockResolvedValue(true);

            const result: BaseViewDto = await orchestrator.updatePassword("newPassword123", mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(result.message).toBe("Password updated");
            expect(userService.updatePassword).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockAuthenticatedRequest.user.id,
                    email: mockAuthenticatedRequest.user.email,
                    name: mockAuthenticatedRequest.user.name,
                    role: mockAuthenticatedRequest.user.role,
                }),
                "newPassword123"
            );
        });

        it("should return error view if password update fails", async () => {
            mockUserService.updatePassword.mockResolvedValue(false);

            const result: BaseViewDto = await orchestrator.updatePassword("badPassword", mockAuthenticatedRequest);

            expect(result.status).toBe(ActionStatus.ERROR);
            expect(result.message).toBe("Error updating password");
        });

        it("should handle password update errors", async () => {
            const passwordError = new Error("Password update failed");
            mockUserService.updatePassword.mockRejectedValue(passwordError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw passwordError;
            });

            await expect(orchestrator.updatePassword("newPassword", mockAuthenticatedRequest)).rejects.toThrow("Password update failed");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(passwordError, "updatePassword");
        });
    });

    describe("deleteUser", () => {
        beforeEach(() => mockHttpErrorHandler.validateAuthenticatedRequest.mockImplementation(() => { }));

        it("should delete user and return success view", async () => {
            mockUserService.remove.mockResolvedValue(undefined);
            mockUserService.findById.mockResolvedValue(null);

            const result: BaseViewDto = await orchestrator.deleteUser(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(result.message).toBe("User deleted successfully");
            expect(result.authenticated).toBe(false);
            expect(userService.remove).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
            expect(userService.findById).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
        });

        it("should throw error if user still exists after deletion", async () => {
            mockUserService.remove.mockResolvedValue(undefined);
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);
            const deleteError = new Error("Could not delete user");
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw deleteError;
            });

            await expect(orchestrator.deleteUser(mockAuthenticatedRequest)).rejects.toThrow("Could not delete user");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(deleteError, "deleteUser");
        });

        it("should handle deletion service errors", async () => {
            const serviceError = new Error("Database error");
            mockUserService.remove.mockRejectedValue(serviceError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw serviceError;
            });

            await expect(orchestrator.deleteUser(mockAuthenticatedRequest)).rejects.toThrow("Database error");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(serviceError, "deleteUser");
        });
    });
});