import { Test, TestingModule } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { CreateUserRequestDto } from "src/adapters/http/user/dto/create-user.request.dto";
import { UpdateUserRequestDto } from "src/adapters/http/user/dto/update-user.request.dto";
import { UserResponseDto } from "src/adapters/http/user/dto/user.response.dto";
import { UserViewDto } from "src/adapters/http/user/dto/user.view.dto";
import { UserOrchestrator } from "src/adapters/http/user/user.orchestrator";
import { AuthService } from "src/core/auth/auth.service";
import { User } from "src/core/user/user.entity";
import { UserService } from "src/core/user/user.service";
import { UserRole } from "src/shared/constants/user.role.enum";

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

    const mockUpdateUserDto: UpdateUserRequestDto = {
        name: "Updated Name",
        email: "updated@example.com",
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("getCreateUserForm", () => {
        it("should return a CreateUserFormDto", () => {
            const result = orchestrator.getCreateUserForm();

            expect(result).toBeDefined();
        });
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

            await expect(orchestrator.create(mockCreateUserDto)).rejects.toThrow("User creation failed");
        });

        it("should throw error if token generation fails", async () => {
            mockUserService.create.mockResolvedValue(new User({ id: 1 }));
            mockAuthService.login.mockResolvedValue({ access_token: null });

            await expect(orchestrator.create(mockCreateUserDto)).rejects.toThrow("Authentication token generation failed");
        });
    });

    describe("findUser", () => {
        it("should return user view with user data", async () => {
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);

            const result: UserViewDto = await orchestrator.findUser(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.user).toEqual(mockUserResponseDto);
            expect(userService.findById).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
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

            expect(result.message).toContain("logged in");
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });
    });

    describe("updateUser", () => {
        it("should update user and return success view", async () => {
            mockUserService.update.mockResolvedValue({
                ...mockUserResponseDto,
                name: "Updated Name",
                email: "updated@example.com",
            });

            const result: UserViewDto = await orchestrator.updateUser(mockUpdateUserDto, mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(result.message).toContain("updated successfully");
            expect(userService.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockAuthenticatedRequest.user.id,
                    name: mockUpdateUserDto.name,
                    email: mockUpdateUserDto.email,
                })
            );
        });

        it("should return no changes view when no changes detected", async () => {
            const noChangeDto: UpdateUserRequestDto = {
                name: mockAuthenticatedRequest.user.name,
                email: mockAuthenticatedRequest.user.email,
            };

            const result: UserViewDto = await orchestrator.updateUser(noChangeDto, mockAuthenticatedRequest);

            expect(result.status).toBe(ActionStatus.NONE);
            expect(result.message).toBe("No changes detected");
            expect(userService.update).not.toHaveBeenCalled();
        });
    });

    describe("updatePassword", () => {
        it("should update password and return success view", async () => {
            mockUserService.updatePassword.mockResolvedValue(true);

            const result: BaseViewDto = await orchestrator.updatePassword("newPassword123", mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(result.message).toBe("Password updated");
            expect(userService.updatePassword).toHaveBeenCalledWith(
                expect.objectContaining({ id: mockAuthenticatedRequest.user.id }),
                "newPassword123"
            );
        });

        it("should return error view if password update fails", async () => {
            mockUserService.updatePassword.mockResolvedValue(false);

            const result: BaseViewDto = await orchestrator.updatePassword("badPassword", mockAuthenticatedRequest);

            expect(result.status).toBe(ActionStatus.ERROR);
            expect(result.message).toBe("Error updating password");
        });
    });

    describe("deleteUser", () => {
        it("should delete user and return success view", async () => {
            mockUserService.remove.mockResolvedValue(undefined);
            mockUserService.findById.mockResolvedValue(null);

            const result: BaseViewDto = await orchestrator.deleteUser(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(result.message).toBe("User deleted successfully");
            expect(result.authenticated).toBe(false);
            expect(userService.remove).toHaveBeenCalledWith(mockAuthenticatedRequest.user.id);
        });

        it("should return error view if user still exists after deletion", async () => {
            mockUserService.remove.mockResolvedValue(undefined);
            mockUserService.findById.mockResolvedValue(mockUserResponseDto);

            await expect(orchestrator.deleteUser(mockAuthenticatedRequest)).rejects.toThrow("Could not delete user");
        });
    });
});