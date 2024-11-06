import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthServicePort } from "src/core/auth/api/auth.service.port";
import { LocalStrategy } from "src/core/auth/local.strategy";
import { UserDto } from "src/core/user/api/user.dto";

describe("LocalStrategy", () => {
    let localStrategy: LocalStrategy;
    let authService: Partial<AuthServicePort>;

    const mockUserDto: UserDto = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        role: "user",
    };

    const mockAuthService = {
        validateUser: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LocalStrategy,
                {
                    provide: AuthServicePort,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        localStrategy = module.get<LocalStrategy>(LocalStrategy);
        authService = module.get<AuthServicePort>(AuthServicePort);
    });

    it("should be defined", () => {
        expect(localStrategy).toBeDefined();
    });

    it("should return the user when credentials are valid", async () => {
        mockAuthService.validateUser.mockResolvedValue(mockUserDto);

        const result = await localStrategy.validate(
            "test@example.com",
            "testPassword",
        );

        expect(result).toEqual(mockUserDto);
        expect(authService.validateUser).toHaveBeenCalledWith(
            "test@example.com",
            "testPassword",
        );
    });

    it("should throw UnauthorizedException when credentials are invalid", async () => {
        mockAuthService.validateUser.mockResolvedValue(null);

        await expect(
            localStrategy.validate("test@example.com", "wrongPassword"),
        ).rejects.toThrow(UnauthorizedException);
        expect(authService.validateUser).toHaveBeenCalledWith(
            "test@example.com",
            "wrongPassword",
        );
    });
});
