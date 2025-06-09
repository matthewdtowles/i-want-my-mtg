import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { UserRole } from "src/adapters/http/auth/auth.types";
import { AuthToken } from "src/core/auth/auth.types";
import { AuthService } from "src/core/auth/auth.service";
import { UserDto } from "src/core/user/user.dto";
import { UserRepositoryPort } from "src/core/user/api/user.repository.port";
import { UserService } from "src/core/user/api/user.service.port";
import { User } from "src/core/user/user.entity";

// Mock User data
const mockUser: User = {
    id: 1,
    email: "test@test.com",
    name: "Test User",
    password: "hashedPassword",
    role: UserRole.User,
};

// Mock UserDto data
const mockUserDto: UserDto = {
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
                        findByEmail: jest.fn().mockResolvedValue(mockUserDto),
                        findSavedPassword: jest.fn().mockResolvedValue(mockUserDto.email),
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
        it("should return UserDto if the email and password are valid", async () => {
            jest
                .spyOn(bcrypt, "compare")
                .mockImplementation(() => Promise.resolve(true));
            const result = await authService.validateUser(mockUser.email, "password");
            expect(bcrypt.compare).toHaveBeenCalledWith("password", mockUser.email);
            expect(userServicePort.findByEmail).toHaveBeenCalledWith(mockUser.email);
            expect(result).toEqual(mockUserDto);
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

            const result = await authService.login(mockUserDto);
            expect(jwtService.signAsync).toHaveBeenCalledWith({
                email: mockUserDto.email,
                sub: mockUserDto.id.toString(),
                role: mockUserDto.role,
            });
            expect(result).toEqual(expectedToken);
        });
    });
});
