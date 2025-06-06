import { Test, TestingModule } from "@nestjs/testing";
import { CardMapper } from "src/core/card/card.mapper";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { InventoryMapper } from "src/core/inventory/inventory.mapper";
import { InventoryService } from "src/core/inventory/inventory.service";
import { TestUtils } from "../../test-utils";
import { MockInventoryRepository } from "./mock.inventory.repository";

describe("InventoryService", () => {
    let service: InventoryService;
    let repository: MockInventoryRepository;

    const testUtils: TestUtils = new TestUtils();
    const mockInventoryDtos: InventoryDto[] = testUtils.mockCreateInventoryDtos();
    const mockDeleteInventoryDtos: InventoryDto[] = testUtils.mockCreateInventoryDtos().map((i: InventoryDto) => {
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
                InventoryMapper,
                CardMapper,
            ],
        }).compile();
        service = module.get<InventoryService>(InventoryService);
        repository = module.get<InventoryRepositoryPort>(InventoryRepositoryPort) as MockInventoryRepository;
        repository.populate(testUtils.mockInventoryList());
    });

    afterEach(() => {
        repository.reset();
    });

    it("should create inventory items and return the saved inventory items", async () => {
        repository.reset();
        jest.spyOn(repository, "save");
        const savedItems: InventoryDto[] = await service.create(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalled();
        expect(savedItems).toEqual(testUtils.mockInventoryDtos());
    });

    it("should update existing inventory items and return the updated inventory items", async () => {
        jest.spyOn(repository, "save");
        const savedItems: InventoryDto[] = await service.update(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalled();
        const expectedItems: InventoryDto[] = [
            testUtils.mockInventoryDtos()[0],
            testUtils.mockInventoryDtos()[2]
        ];
        expect(savedItems).toEqual(expectedItems);
    });

    it("should delete inventory items when update is called and item quantity is 0", async () => {
        jest.spyOn(repository, "save");
        const savedItems: InventoryDto[] = await service.update(mockDeleteInventoryDtos);
        expect(repository.save).toHaveBeenCalled();
        expect(savedItems).toEqual([]);
    });

    it("should find an inventory item for a user", async () => {
        jest.spyOn(repository, "findByCard");
        const foundItems: InventoryDto[] = await service.findForUser(1, 1);
        expect(repository.findByCard).toHaveBeenCalled();
        expect(foundItems).toHaveLength(1);
    });

    it("should return [] if userId is not provided for findOneForUser", async () => {
        jest.spyOn(repository, "findByCard");
        const foundItems: InventoryDto[] = await service.findForUser(null, 1);
        expect(repository.findByCard).not.toHaveBeenCalled();
        expect(foundItems).toEqual([]);
    });

    it("should return null if cardId is not provided for findOneForUser", async () => {
        jest.spyOn(repository, "findByCard");
        const foundItems: InventoryDto[] = await service.findForUser(1, null);
        expect(repository.findByCard).not.toHaveBeenCalled();
        expect(foundItems).toEqual([]);
    });

    it("should find inventory items with cards for a user", async () => {
        jest.spyOn(repository, "findByUser");

        const result: InventoryDto[] = await service.findAllCardsForUser(1);
        expect(repository.findByUser).toHaveBeenCalled();
        expect(repository.findByUser).toHaveBeenCalledWith(1);
        expect(result).toHaveLength(3);

        const firstItem = result[0];
        expect(firstItem.card.id).toBe(1);
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
        expect(secondItem.card.id).toBe(2);
        expect(secondItem.card.name).toBe("Test Card Name 2");
        expect(secondItem.quantity).toBe(0);

        const thirdItem = result[2];
        expect(thirdItem.card.id).toBe(3);
        expect(thirdItem.card.name).toBe("Test Card Name 3");
        expect(thirdItem.quantity).toBe(4);
    });

    it("should return an empty array if userId is not provided for findAllCardsForUser", async () => {
        jest.spyOn(repository, "findByUser");
        const foundItems: InventoryDto[] = await service.findAllCardsForUser(null);
        expect(repository.findByUser).not.toHaveBeenCalled();
        expect(foundItems).toEqual([]);
    });

    it("should delete an inventory item for a user and return true on success", async () => {
        const userId = 1;
        const cardId = 1;
        jest.spyOn(repository, "delete");
        const result = await service.delete(userId, cardId, false);
        expect(repository.delete).toHaveBeenCalledWith(userId, cardId, false);
        expect(result).toBe(true);
    });

    it("should return false if userId is not provided for delete", async () => {
        jest.spyOn(repository, "delete");
        const cardId = 1;
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
        const cardId = 1;
        const result = await service.delete(userId, cardId, false);
        expect(repository.delete).toHaveBeenCalled();
        expect(result).toBe(false);
    });
});
