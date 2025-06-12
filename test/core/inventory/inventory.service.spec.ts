import { Test, TestingModule } from "@nestjs/testing";
import { Inventory, InventoryRepositoryPort, InventoryService } from "src/core/inventory";
import { TestUtils } from "../../test-utils";
import { MockInventoryRepository } from "./mock.inventory.repository";

describe("InventoryService", () => {
    let service: InventoryService;
    let repository: MockInventoryRepository;

    const testUtils: TestUtils = new TestUtils();
    const mockInventoryList: Inventory[] = testUtils.mockWriteInventoryList();
    const mockDeleteInventoryList: Inventory[] = testUtils.mockWriteInventoryList().map((i: Inventory) => {
        return {
            cardId: i.cardId,
            isFoil: i.isFoil,
            quantity: 0,
            userId: i.userId,
        };
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: InventoryRepositoryPort,
                    useClass: MockInventoryRepository,
                },
            ],
        }).compile();
        service = module.get<InventoryService>(InventoryService);
        repository = module.get<InventoryRepositoryPort>(InventoryRepositoryPort) as MockInventoryRepository;
        repository.populate(testUtils.mockReadInventoryList());
    });

    afterEach(() => {
        repository.reset();
    });

    it("should create inventory items and return the saved inventory items", async () => {
        repository.reset();
        jest.spyOn(repository, "save");
        const savedItems: Inventory[] = await service.save(mockInventoryList);
        expect(repository.save).toHaveBeenCalled();
        expect(savedItems).toEqual(testUtils.mockReadInventoryList());
    });

    it("should update existing inventory items and return the updated inventory items", async () => {
        jest.spyOn(repository, "save");
        const savedItems: Inventory[] = await service.save(mockInventoryList);
        expect(repository.save).toHaveBeenCalled();
        const expectedItems: Inventory[] = [
            testUtils.mockReadInventoryList()[0],
            testUtils.mockReadInventoryList()[2]
        ];
        expect(savedItems).toEqual(expectedItems);
    });

    it("should delete inventory items when update is called and item quantity is 0", async () => {
        jest.spyOn(repository, "save");
        const savedItems: Inventory[] = await service.save(mockDeleteInventoryList);
        expect(repository.save).toHaveBeenCalled();
        expect(savedItems).toEqual([]);
    });

    it("should find an inventory item for a user", async () => {
        jest.spyOn(repository, "findByCard");
        const foundItems: Inventory[] = await service.findForUser(1, "1");
        expect(repository.findByCard).toHaveBeenCalled();
        expect(foundItems).toHaveLength(1);
    });

    it("should return [] if userId is not provided for findOneForUser", async () => {
        jest.spyOn(repository, "findByCard");
        const foundItems: Inventory[] = await service.findForUser(null, "1");
        expect(repository.findByCard).not.toHaveBeenCalled();
        expect(foundItems).toEqual([]);
    });

    it("should return null if cardId is not provided for findOneForUser", async () => {
        jest.spyOn(repository, "findByCard");
        const foundItems: Inventory[] = await service.findForUser(1, null);
        expect(repository.findByCard).not.toHaveBeenCalled();
        expect(foundItems).toEqual([]);
    });

    it("should find inventory items with cards for a user", async () => {
        jest.spyOn(repository, "findByUser");

        const result: Inventory[] = await service.findAllCardsForUser(1);
        expect(repository.findByUser).toHaveBeenCalled();
        expect(repository.findByUser).toHaveBeenCalledWith(1);
        expect(result).toHaveLength(3);

        const firstItem = result[0];
        expect(firstItem.card.order).toBe(1);
        expect(firstItem.card.name).toBe("Test Card Name 1");
        expect(firstItem.card.setCode).toBe("SET");
        expect(firstItem.card.legalities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ cardId: 1, format: "standard", status: "legal" }),
                expect.objectContaining({ cardId: 1, format: "commander", status: "legal" }),
            ])
        );
        expect(firstItem.card.prices).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ cardId: 1, normal: 5, foil: 10 }),
            ])
        );
        expect(firstItem.quantity).toBe(4);
        expect(firstItem.userId).toBe(1);

        const secondItem = result[1];
        expect(secondItem.card.order).toBe(2);
        expect(secondItem.card.name).toBe("Test Card Name 2");
        expect(secondItem.quantity).toBe(0);

        const thirdItem = result[2];
        expect(thirdItem.card.order).toBe(3);
        expect(thirdItem.card.name).toBe("Test Card Name 3");
        expect(thirdItem.quantity).toBe(4);
    });

    it("should return an empty array if userId is not provided for findAllCardsForUser", async () => {
        jest.spyOn(repository, "findByUser");
        const foundItems: Inventory[] = await service.findAllCardsForUser(null);
        expect(repository.findByUser).not.toHaveBeenCalled();
        expect(foundItems).toEqual([]);
    });

    it("should delete an inventory item for a user and return true on success", async () => {
        const userId = 1;
        const cardId = "1";
        jest.spyOn(repository, "delete");
        const result = await service.delete(userId, cardId, false);
        expect(repository.delete).toHaveBeenCalledWith(userId, cardId, false);
        expect(result).toBe(true);
    });

    it("should return false if userId is not provided for delete", async () => {
        jest.spyOn(repository, "delete");
        const cardId = "1";
        const result = await service.delete(null, cardId, false);
        expect(repository.delete).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it("should return false if cardId is not provided for delete", async () => {
        jest.spyOn(repository, "delete");
        const userId = 1;
        const result = await service.delete(userId, null, false);
        expect(repository.delete).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it("should return false if inventory item not deleted", async () => {
        jest.spyOn(repository, "delete").mockImplementation(() => {
            throw new Error("Item not found");
        });
        const userId = 1;
        const cardId = "1";
        const result = await service.delete(userId, cardId, false);
        expect(repository.delete).toHaveBeenCalled();
        expect(result).toBe(false);
    });
});
