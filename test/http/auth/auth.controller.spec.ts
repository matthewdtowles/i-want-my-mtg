import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AUTH_TOKEN_NAME } from "../../../src/adapters/http/auth/auth.constants";
import { AuthController } from "../../../src/adapters/http/auth/auth.controller";
import { LocalAuthGuard } from "../../../src/adapters/http/auth/local.auth.guard";
import { AuthToken } from "../../../src/core/auth/auth.types";
import { AuthServicePort } from "../../../src/core/auth/ports/auth.service.port";

describe("AuthController", () => {
    let app: INestApplication;
    let authService: AuthServicePort;

    const mockAuthService = {
        login: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthServicePort,
                    useValue: mockAuthService,
                },
            ],
        })
            .overrideGuard(LocalAuthGuard)
            .useValue({
                canActivate: jest.fn().mockImplementation((context) => {
                    const request = context.switchToHttp().getRequest();
                    request.user = {
                        id: 1,
                        username: "testuser",
                        email: "testemail@iwmm.com",
                    };
                    return true;
                }),
            })
            .compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        authService = moduleFixture.get<AuthServicePort>(AuthServicePort);
    });

    afterAll(async () => {
        await app.close();
    });

    describe("/POST login", () => {
        it("should return a JWT token in the AuthToken header and redirect if login succeeds", async () => {
            const mockAuthToken: AuthToken = {
                access_token: "jwt-token",
            };
            mockAuthService.login.mockResolvedValueOnce(mockAuthToken);

            const response = await request(app.getHttpServer())
                .post("/auth/login")
                .send({ username: "testuser", password: "testpass" })
                .expect(302);

            expect(response.headers["set-cookie"]).toBeDefined();
            expect(response.headers["set-cookie"][0]).toContain(
                `${AUTH_TOKEN_NAME}=jwt-token`,
            );
            expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
            expect(response.headers["set-cookie"][0]).toContain("Max-Age=");
            expect(response.headers["set-cookie"][0]).toContain("SameSite=Strict");
            expect(response.headers["location"]).toEqual(
                "/user?action=login&status=200",
            );
        });

        it("should return 401 Unauthorized and error message if login fails", async () => {
            mockAuthService.login.mockResolvedValueOnce(null);

            const response = await request(app.getHttpServer())
                .post("/auth/login")
                .send({ username: "invaliduser", password: "invalidpass" })
                .expect(302);

            expect(response.headers["location"]).toBe(
                "/login?action=login&status=401",
            );
            expect(response.body).toEqual({});
        });
    });

    it("should logout user by clearing auth token cookie", async () => {
        const mockAuthToken: AuthToken = {
            access_token: "jwt-token",
        };
        mockAuthService.login.mockResolvedValueOnce(mockAuthToken);

        let response = await request(app.getHttpServer())
            .post("/auth/login")
            .send({ username: "testuser", password: "testpass" })
            .expect(302);

        expect(response.headers["set-cookie"]).toBeDefined();
        expect(response.headers["set-cookie"][0]).toContain(
            `${AUTH_TOKEN_NAME}=jwt-token`,
        );

        // logged in - now logout:
        response = await request(app.getHttpServer())
            .get("/auth/logout")
            .expect(302);

        expect(response.headers["set-cookie"]).toBeDefined();
        expect(response.headers["set-cookie"][0]).toContain(`${AUTH_TOKEN_NAME}=`);
    });
});
