import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "src/adapters/http/auth/auth.controller";
import { AuthService } from "src/core/auth/auth.service";
import { UserRole } from "src/shared/constants/user.role.enum";
import { Response } from "express";

describe("AuthController", () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        login: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);
    });

    describe("login", () => {
        it("should return a JWT token in a cookie and redirect on success", async () => {
            const userDto = {
                id: 1,
                name: "Test User",
                email: "testuser@example.com",
                role: UserRole.User,
            };

            const mockReq = { user: userDto } as any;
            const mockRes = {
                cookie: jest.fn(),
                redirect: jest.fn(),
            } as unknown as Response;

            mockAuthService.login.mockResolvedValue({
                access_token: "mock-jwt-token",
            });

            await controller.login(mockReq, mockRes);

            expect(authService.login).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: userDto.id,
                    email: userDto.email,
                    name: userDto.name,
                    role: userDto.role,
                })
            );
            expect(mockRes.cookie).toHaveBeenCalledWith(
                "authorization",
                "mock-jwt-token",
                expect.any(Object),
            );
            expect(mockRes.redirect).toHaveBeenCalledWith("/");
        });
    });

    describe("logout", () => {
        it("should clear the auth cookie and redirect", () => {
            // Arrange
            const mockRes = {
                clearCookie: jest.fn(),
                redirect: jest.fn(),
            } as unknown as Response;

            // Act
            controller.logout(mockRes);

            // Assert
            expect(mockRes.clearCookie).toHaveBeenCalledWith("authorization");
            expect(mockRes.redirect).toHaveBeenCalled();
        });
    });
});
