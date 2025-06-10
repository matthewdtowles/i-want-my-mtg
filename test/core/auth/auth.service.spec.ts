import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { UserRole } from "src/adapters/http/auth/auth.types";
import { AuthService } from "src/core/auth/auth.service";
import { AuthToken } from "src/core/auth/auth.types";
import { User, UserRepositoryPort, UserService } from "src/core/user";

// Mock User data
const mockUser: User = {
    id: 1,
    email: "test@test.com",
    name: "Test User",
    password: "hashedPassword",
    role: UserRole.User,
};

// Mock User data
const mockUser: User = {
    id: 1,
    email: "test@test.com",
    name: "Test User",
    role: UserRole.User,
};

describe("AuthService", () => {
    let authService: AuthService;
    let userServicePort: UserService;
    let userRepositoryPort: UserRepositoryPort;
    let jwtService: JwtService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserServicePort,
                    useValue: {
                        findByEmail: jest.fn().mockResolvedValue(mockUser),
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
                        signAsync: jest.fn().mockResolvedValue("jwtToken"),
                    },
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userServicePort = module.get<UserService>(UserServicePort);
        userRepositoryPort = module.get<UserRepositoryPort>(UserRepositoryPort);
        jwtService = module.get<JwtService>(JwtService);
    });

    describe("validateUser", () => {
        it("should return User if the email and password are valid", async () => {
            jest
                .spyOn(bcrypt, "compare")
                .mockImplementation(() => Promise.resolve(true));
            const result = await authService.validateUser(mockUser.email, "password");
            expect(bcrypt.compare).toHaveBeenCalledWith("password", mockUser.email);
            expect(userServicePort.findByEmail).toHaveBeenCalledWith(mockUser.email);
            expect(result).toEqual(mockUser);
        });

        it("should return null if the email or password is invalid", async () => {
            jest
                .spyOn(bcrypt, "compare")
                .mockImplementation(() => Promise.resolve(false));

            const result = await authService.validateUser(
                mockUser.email,
                "wrong-password",
            );
            expect(result).toBeNull();
        });
    });

    describe("login", () => {
        it("should return an access token", async () => {
            const expectedToken: AuthToken = { access_token: "jwtToken" };

            const result = await authService.login(mockUser);
            expect(jwtService.signAsync).toHaveBeenCalledWith({
                email: mockUser.email,
                sub: mockUser.id.toString(),
                role: mockUser.role,
            });
            expect(result).toEqual(expectedToken);
        });
    });
});
