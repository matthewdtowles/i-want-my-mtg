import { Test, TestingModule } from "@nestjs/testing";
import { CardMapper } from "src/core/card/card.mapper";
import { InventoryCardDto, InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { InventoryMapper } from "src/core/inventory/inventory.mapper";
import { InventoryService } from "src/core/inventory/inventory.service";
import { TestUtils } from "../../test-utils";
import { MockInventoryRepository } from "./mock.inventory.repository";

describe("InventoryService", () => {
    let service: InventoryService;
    let repository: MockInventoryRepository;

    const testUtils: TestUtils = new TestUtils();
    const mockInventoryDtos: InventoryDto[] = testUtils.getMockCreateInventoryDtos();
    const mockDeleteInventoryDtos: InventoryDto[] = testUtils.getMockCreateInventoryDtos().map((i: InventoryDto) => {
        return {
            cardId: i.cardId,
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
        repository.populate(testUtils.getMockInventoryList());
    });

    afterEach(() => {
        repository.reset();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it("should create inventory items and return the saved inventory items", async () => {
        repository.reset();
        jest.spyOn(repository, "save");
        const savedItems: InventoryDto[] = await service.create(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalled();
        expect(savedItems).toEqual(testUtils.getMockInventoryDtos());
    });

    it("should update existing inventory items and return the updated inventory items", async () => {
        jest.spyOn(repository, "save");
        const savedItems: InventoryDto[] = await service.update(mockInventoryDtos);
        expect(repository.save).toHaveBeenCalled();
        const expectedItems: InventoryDto[] = [
            testUtils.getMockInventoryDtos()[0],
            testUtils.getMockInventoryDtos()[2]
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
        jest.spyOn(repository, "findOne");
        const foundItem: InventoryDto = await service.findOneForUser(testUtils.MOCK_USER_ID, 1);
        expect(repository.findOne).toHaveBeenCalled();
        expect(foundItem).toEqual(testUtils.getMockInventoryDtos()[0]);
    });

    it("should return null if userId is not provided for findOneForUser", async () => {
        jest.spyOn(repository, "findOne");
        const foundItem: InventoryDto = await service.findOneForUser(null, 1);
        expect(repository.findOne).not.toHaveBeenCalled();
        expect(foundItem).toBeNull();
    });

    it("should return null if cardId is not provided for findOneForUser", async () => {
        jest.spyOn(repository, "findOne");
        const foundItem: InventoryDto = await service.findOneForUser(testUtils.MOCK_USER_ID, null);
        expect(repository.findOne).not.toHaveBeenCalled();
        expect(foundItem).toBeNull();
    });

    it("should find inventory items with cards for a user", async () => {
        jest.spyOn(repository, "findByUser");
        const foundItems: InventoryCardDto[] = await service.findAllCardsForUser(testUtils.MOCK_USER_ID);
        expect(repository.findByUser).toHaveBeenCalled();
        expect(foundItems).toEqual(testUtils.getMockInventoryCardDtos());
    });

    it("should return an empty array if userId is not provided for findAllCardsForUser", async () => {
        jest.spyOn(repository, "findByUser");
        const foundItems: InventoryCardDto[] = await service.findAllCardsForUser(null);
        expect(repository.findByUser).not.toHaveBeenCalled();
        expect(foundItems).toEqual([]);
    });

    it("should delete an inventory item for a user and return true on success", async () => {
        const userId = testUtils.MOCK_USER_ID;
        const cardId = 1;
        jest.spyOn(repository, "delete");
        const result = await service.delete(userId, cardId);
        expect(repository.delete).toHaveBeenCalledWith(userId, cardId);
        expect(result).toBe(true);
    });

    it("should return false if userId is not provided for delete", async () => {
        jest.spyOn(repository, "delete");
        const cardId = 1;
        const result = await service.delete(null, cardId);
        expect(repository.delete).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it("should return false if cardId is not provided for delete", async () => {
        jest.spyOn(repository, "delete");
        const userId = testUtils.MOCK_USER_ID;
        const result = await service.delete(userId, null);
        expect(repository.delete).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it("should return false if inventory item not deleted", async () => {
        jest.spyOn(repository, "delete").mockImplementation(() => {
            throw new Error("Item not found");
        });
        const userId = testUtils.MOCK_USER_ID;
        const cardId = 1;
        const result = await service.delete(userId, cardId);
        expect(repository.delete).toHaveBeenCalled();
        expect(result).toBe(false);
    });
});
