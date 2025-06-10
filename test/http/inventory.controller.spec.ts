import { Test, TestingModule } from "@nestjs/testing";
import { InventoryController } from "src/adapters/http/inventory/inventory.controller";
import { InventoryService } from "src/core/inventory";

describe("InventoryController", () => {
    let controller: InventoryController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InventoryController],
            providers: [InventoryService],
        }).compile();
        controller = module.get<InventoryController>(InventoryController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
