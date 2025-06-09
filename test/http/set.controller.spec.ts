import { Test, TestingModule } from "@nestjs/testing";
import { SetController } from "src/adapters/http/set.controller";
import { AggregatorService } from "src/core/aggregator/api/aggregator.service.port";
import { SetService } from "src/core/set/api/set.service.port";

describe("SetController", () => {
    let controller: SetController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SetController],
            providers: [
                {
                    provide: SetServicePort,
                    useValue: {},
                },
                {
                    provide: AggregatorServicePort,
                    useValue: {},
                },
            ],
        }).compile();
        controller = module.get<SetController>(SetController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});