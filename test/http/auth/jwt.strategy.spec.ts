import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { UserResponseDto } from "src/adapters/http/user/dto/user.response.dto";
import { JwtPayload } from "src/core/auth/auth.types";
import { JwtStrategy } from "src/core/auth/jwt.strategy";
import { UserService } from "src/core/user/user.service";

const mockUserDto: UserResponseDto = {
    id: 1,
    email: "test@test.com",
    name: "Test User",
    role: "user",
};

const mockJwtPayload: JwtPayload = {
    sub: "1",
    email: "test@test.com",
    role: "user",
};

describe("JwtStrategy", () => {
    let jwtStrategy: JwtStrategy;
    let userService: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: UserService,
                    useValue: {
                        findById: jest.fn().mockResolvedValue(mockUserDto),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue("mockJwtSecret"),
                    },
                },
            ],
        }).compile();

        jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
        userService = module.get<UserService>(UserService);
    });

    describe("validate", () => {
        it("should return a UserDto if the user is found", async () => {
            const result = await jwtStrategy.validate(mockJwtPayload);
            expect(userService.findById).toHaveBeenCalledWith(
                parseInt(mockJwtPayload.sub),
            );
            expect(result).toEqual(mockUserDto);
        });

        it("should throw UnauthorizedException if no user is found", async () => {
            jest.spyOn(userService, "findById").mockResolvedValue(null);
            await expect(jwtStrategy.validate(mockJwtPayload)).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});
