import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import { AuthenticatedRequest, UserRole } from "src/adapters/http/auth/auth.types";
import { LocalAuthGuard } from "src/adapters/http/auth/local.auth.guard";
import { UserController } from "src/adapters/http/user.controller";
import { AuthServicePort } from "src/core/auth/api/auth.service.port";
import { CreateUserDto, UserDto } from "src/core/user/api/user.dto";
import { UserServicePort } from "src/core/user/api/user.service.port";

const createUserDto: CreateUserDto = {
    email: "test-email1@iwantmymtg.com",
    name: "test-username1",
    password: "abCD12#$",
};

const mockUser: UserDto = {
    id: 1,
    name: "test-username1",
    email: "test-email1@iwantmymtg.com",
    role: UserRole.User,
};

const mockResponse = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    };
    return res as unknown as Response;
};

const mockRequest: Partial<AuthenticatedRequest> = {
    user: {
        id: 1,
        name: createUserDto.name,
        email: createUserDto.email,
        role: UserRole.User,
    },
};

describe("UserController", () => {
    let app: INestApplication;
    let controller: UserController;
    let service: UserServicePort;
    let res: Response | Response<any, Record<string, any>>;
    let req: AuthenticatedRequest;

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
                {
                    provide: AuthServicePort,
                    useValue: {
                        validateUser: jest.fn().mockResolvedValue(mockUser),
                        login: jest.fn().mockResolvedValue({
                            sub: mockUser.id,
                            email: mockUser.email,
                            role: mockUser.role,
                        }),
                    }
                }
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
        req = mockRequest as AuthenticatedRequest;
    });

    it("should create a user and redirect with a success message", async () => {
        const expectedUrl = `/user`;
        const expectedMessage = `Account created for ${createUserDto.name}`;
        await controller.create(createUserDto, res);
        expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(expectedUrl));
        expect(service.create).toHaveBeenCalledWith(createUserDto);
    });

    it("should return user details and set an AuthToken cookie", async () => {
        // This test can be implemented for GET or login behavior
    });

    it("should remove given user", async () => {
        jest.spyOn(service, "remove").mockResolvedValue(undefined);
        jest.spyOn(service, "findById").mockResolvedValue(null);
        await controller.remove(res, req);
        expect(service.remove).toHaveBeenCalledWith(req.user.id);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("User deleted") }));
    });
});
