import { Test, TestingModule } from "@nestjs/testing";
import { SetController } from "src/adapters/http/set/set.controller";
import { SetService } from "src/core/set";

describe("SetController", () => {
    let controller: SetController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SetController],
            providers: [SetService],
        }).compile();
        controller = module.get<SetController>(SetController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});