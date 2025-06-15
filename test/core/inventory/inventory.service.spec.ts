import { Test, TestingModule } from "@nestjs/testing";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { InventoryService } from "src/core/inventory/inventory.service";

describe("InventoryService", () => {
    let service: InventoryService;
    let repository: jest.Mocked<InventoryRepositoryPort>;

    const testInventoryItem = new Inventory({
        cardId: "card-1",
        userId: 1,
        isFoil: false,
        quantity: 4,
    });

    const testInventoryFoil = new Inventory({
        cardId: "card-1",
        userId: 1,
        isFoil: true,
        quantity: 2,
    });

    beforeEach(async () => {
        const mockRepository = {
            save: jest.fn(),
            findOne: jest.fn(),
            findByCard: jest.fn(),
            findByUser: jest.fn(),
            delete: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: InventoryRepositoryPort, useValue: mockRepository }
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        repository = module.get(InventoryRepositoryPort) as jest.Mocked<InventoryRepositoryPort>;
    });

    describe("save", () => {
        it("should save inventory items with positive quantity", async () => {
            const itemsToSave = [testInventoryItem, testInventoryFoil];
            repository.save.mockResolvedValue(itemsToSave);

            const result = await service.save(itemsToSave);

            expect(repository.save).toHaveBeenCalledWith(itemsToSave);
            expect(result).toEqual(itemsToSave);
        });

        it("should delete inventory items with zero quantity", async () => {
            const itemToDelete = new Inventory({
                cardId: "card-1",
                userId: 1,
                isFoil: false,
                quantity: 0
            });

            const itemToSave = new Inventory({
                cardId: "card-2",
                userId: 1,
                isFoil: false,
                quantity: 3
            });

            repository.save.mockResolvedValue([itemToSave]);
            repository.delete.mockResolvedValue();

            const result = await service.save([itemToDelete, itemToSave]);

            expect(repository.delete).toHaveBeenCalledWith(1, "card-1", false);
            expect(repository.save).toHaveBeenCalledWith([itemToSave]);
            expect(result).toEqual([itemToSave]);
        });

        it("should handle empty array input", async () => {
            repository.save.mockResolvedValue([]);
            const result = await service.save([]);

            expect(repository.save).toHaveBeenCalledWith([]);
            expect(result).toEqual([]);
        });
    });

    describe("findForUser", () => {
        it("should find inventory items by userId and cardId", async () => {
            const expectedItems = [testInventoryItem, testInventoryFoil];
            repository.findByCard.mockResolvedValue(expectedItems);
            const result = await service.findForUser(1, "card-1");

            expect(repository.findByCard).toHaveBeenCalledWith(1, "card-1");
            expect(result).toEqual(expectedItems);
        });

        it("should return empty array when userId is missing", async () => {
            const result = await service.findForUser(null, "card-1");
            expect(repository.findByCard).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it("should return empty array when cardId is missing", async () => {
            const result = await service.findForUser(1, null);

            expect(repository.findByCard).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    describe("findAllCardsForUser", () => {
        it("should find all inventory items for a user", async () => {
            const expectedItems = [testInventoryItem, testInventoryFoil];
            repository.findByUser.mockResolvedValue(expectedItems);
            const result = await service.findAllCardsForUser(1);

            expect(repository.findByUser).toHaveBeenCalledWith(1);
            expect(result).toEqual(expectedItems);
        });

        it("should return empty array when userId is missing", async () => {
            const result = await service.findAllCardsForUser(null);
            expect(repository.findByUser).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    describe("delete", () => {
        it("should delete an inventory item and return true on success", async () => {
            repository.delete.mockResolvedValue();
            repository.findOne.mockResolvedValue(null); // Item no longer found after deletion
            const result = await service.delete(1, "card-1", false);

            expect(repository.delete).toHaveBeenCalledWith(1, "card-1", false);
            expect(repository.findOne).toHaveBeenCalledWith(1, "card-1", false);
            expect(result).toBe(true);
        });

        it("should return false if item still exists after deletion", async () => {
            repository.delete.mockResolvedValue();
            repository.findOne.mockResolvedValue(testInventoryItem); // Item still exists
            const result = await service.delete(1, "card-1", false);

            expect(repository.delete).toHaveBeenCalledWith(1, "card-1", false);
            expect(result).toBe(false);
        });

        it("should return false when userId is missing", async () => {
            const result = await service.delete(null, "card-1", false);
            expect(repository.delete).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it("should return false when cardId is missing", async () => {
            const result = await service.delete(1, null, false);

            expect(repository.delete).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it("should handle errors during deletion", async () => {
            repository.delete.mockRejectedValue(new Error("Database error"));
            const result = await service.delete(1, "card-1", false);

            expect(repository.delete).toHaveBeenCalledWith(1, "card-1", false);
            expect(result).toBe(false);
        });
    });
});
