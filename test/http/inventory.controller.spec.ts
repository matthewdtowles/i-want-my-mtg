import { Test, TestingModule } from "@nestjs/testing";
import { InventoryController } from "src/adapters/http/inventory.controller";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";

describe("InventoryController", () => {
    let controller: InventoryController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InventoryController],
            providers: [
                {
                    provide: InventoryServicePort,
                    useValue: {},
                },
            ],
        }).compile();
        controller = module.get<InventoryController>(InventoryController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
