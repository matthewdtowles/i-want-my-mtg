import { Test, TestingModule } from "@nestjs/testing";
import { UserController } from "src/adapters/http/user/user.controller";
import { AuthService } from "src/core/auth";
import { UserService } from "src/core/user";

describe("UserController", () => {
    let controller: UserController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [UserService, AuthService],
        }).compile();
        controller = module.get<UserController>(UserController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
