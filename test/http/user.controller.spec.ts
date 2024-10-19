import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { LocalAuthGuard } from "../../src/adapters/http/auth/local.auth.guard";
import { UserController } from "../../src/adapters/http/user.controller";
import { CreateUserDto } from "../../src/core/user/dto/create-user.dto";
import { UserDto } from "../../src/core/user/dto/user.dto";
import { UserServicePort } from "../../src/core/user/ports/user.service.port";
import { Response } from "express";
import { UserRole } from "../../src/adapters/http/auth/user.role";
import { AuthenticatedRequest } from "../../src/adapters/http/auth/authenticated.request";

const createUserDto: CreateUserDto = {
  email: "test-email1@iwantmymtg.com",
  name: "test-username1",
  password: "abCD12#$",
};

const mockUser: UserDto = {
  id: 1,
  name: "test-username1",
  email: "test-email1@iwantmymtg.com",
  inventory: [],
  role: UserRole.User,
};

const mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const mockRequest: Partial<AuthenticatedRequest> = {
  user: {
    id: 1,
    name: createUserDto.name,
    email: createUserDto.email,
    role: UserRole.User,
    inventory: [],
  },
};

describe("UsersController", () => {
  let app: INestApplication;
  let controller: UserController;
  let service: UserServicePort;
  let res: Response | Response<any, Record<string, any>>;
  let req: Partial<AuthenticatedRequest>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserServicePort,
          useValue: {
            create: jest.fn().mockResolvedValue(mockUser),
            findByEmail: jest.fn().mockResolvedValue(mockUser),
            findById: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(mockUser),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: jest.fn().mockImplementation((context) => {
          const request = context.switchToHttp().getRequest();
          request.cookies["set-cookie"][0] = { AUTH_TOKEN_NAME: "authToken" };
          return true;
        }),
      })
      .compile();
    app = module.createNestApplication();
    await app.init();

    controller = module.get<UserController>(UserController);
    service = module.get<UserServicePort>(UserServicePort);
    res = mockResponse();
    req = mockRequest;
  });

  it("users controller should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create a user", () => {
    controller.create(createUserDto);
    const expectedUrl: string = `/user`;
    expect(controller.create(createUserDto)).resolves.toEqual({
      message: `Account created for ${createUserDto.name}`,
      url: expectedUrl,
    });
    expect(service.create).toHaveBeenCalledWith(createUserDto);
  });

  it("should return user details and set an AuthToken cookie", async () => {
    // const mockUser = { id: 1, username: 'testuser' };
    // const response = await request(app.getHttpServer())
    //     .get('/user/1')
    //     .expect(200);
    // expect(response.body).toEqual(mockUser);
    // expect(response.headers['set-cookie']).toBeDefined();
    // expect(response.headers['set-cookie'][0]).toContain(`${AUTH_TOKEN_NAME}=mock-jwt-token`);
    // expect(service.findById).toHaveBeenCalled();
  });

  it("should remove given user", () => {
//    controller.remove(res, req);
//    expect(service.remove).toHaveBeenCalled();
  });
});
