import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { UserDto } from "../../../src/core//user/dto/user.dto";
import { JwtPayload } from "../../../src/core/auth/auth.types";
import { JwtStrategy } from "../../../src/core/auth/jwt.strategy";
import { UserServicePort } from "../../../src/core/user/ports/user.service.port";

const mockUserDto: UserDto = {
  id: 1,
  email: "test@test.com",
  name: "Test User",
  inventory: [],
  role: "user",
};

const mockJwtPayload: JwtPayload = {
    sub: "1",
    email: "test@test.com",
    role: "user",
};

describe("JwtStrategy", () => {
  let jwtStrategy: JwtStrategy;
  let userServicePort: UserServicePort;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UserServicePort,
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
    userServicePort = module.get<UserServicePort>(UserServicePort);
  });

  describe("validate", () => {
    it("should return a UserDto if the user is found", async () => {
      const result = await jwtStrategy.validate(mockJwtPayload);
      expect(userServicePort.findById).toHaveBeenCalledWith(
        parseInt(mockJwtPayload.sub),
      );
      expect(result).toEqual(mockUserDto);
    });

    it("should throw UnauthorizedException if no user is found", async () => {
      jest.spyOn(userServicePort, "findById").mockResolvedValue(null);
      await expect(jwtStrategy.validate(mockJwtPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
