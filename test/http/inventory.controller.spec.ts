import { Test, TestingModule } from "@nestjs/testing";
import { InventoryController } from "src/adapters/http/inventory.controller";

describe("InventoryController", () => {
    let controller: InventoryController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InventoryController],
            providers: [
                {
                    provide: "InventoryServicePort",
                    useValue: {
                        create: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        findByUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<InventoryController>(InventoryController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
