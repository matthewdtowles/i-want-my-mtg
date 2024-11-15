import { Test, TestingModule } from "@nestjs/testing";
import { UserController } from "src/adapters/http/user.controller";
import { AuthServicePort } from "src/core/auth/api/auth.service.port";
import { UserServicePort } from "src/core/user/api/user.service.port";

describe("UserController", () => {
    let controller: UserController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserServicePort,
                    useValue: {},
                },
                {
                    provide: AuthServicePort,
                    useValue: {}
                },
            ],
        }).compile();
        controller = module.get<UserController>(UserController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
