import { Test, TestingModule } from "@nestjs/testing";
import { AggregatorService } from "src/core/aggregator/aggregator.service";
import { InventoryCardAggregateDto, InventorySetAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";
import { Set } from "src/core/set/set.entity";
import { TestUtils } from "../../test-utils";

describe("AggregatorService", () => {
    let subject: AggregatorService;
    const testUtils: TestUtils = new TestUtils();
    const setCode = "SET";
    const userId = 1;
    const mockCardService: CardServicePort = {
        save: jest.fn(),
        findAllWithName: jest.fn(),
        findById: jest.fn(),
        findBySetCodeAndNumber: jest.fn(),
    };
    const mockSetWithCards: Set = testUtils.mockSet(setCode);
    mockSetWithCards.cards = testUtils.mockCards(setCode);
    const mockSetService: SetServicePort = {
        findByCode: jest.fn().mockResolvedValue(mockSetWithCards),
        findAll: jest.fn(),
        save: jest.fn(),
    };
    const mockInventoryService: InventoryServicePort = {
        findAllCardsForUser: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findForUser: jest.fn().mockResolvedValue(testUtils.mockInventoryDtos()),
        delete: function (userId: number, cardId: number): Promise<boolean> {
            throw new Error("Function not implemented.");
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AggregatorService,
                { provide: CardServicePort, useValue: mockCardService },
                { provide: SetServicePort, useValue: mockSetService },
                { provide: InventoryServicePort, useValue: mockInventoryService },
            ],
        }).compile();
        subject = module.get<AggregatorService>(AggregatorService);
    });

    describe("findInventorySetByCode", () => {
        it("should throw error if set not found", async () => {
            const invalidSetCode = "INVALID";
            jest.spyOn(mockSetService, "findByCode").mockResolvedValueOnce(null);
            await expect(subject.findInventorySetByCode(invalidSetCode, userId)).rejects.toThrow(`Set with code ${invalidSetCode} not found`);
        });

        it("should throw error if set found but has no cards", async () => {
            jest.spyOn(mockSetService, "findByCode").mockResolvedValueOnce(new SetDto());
            await expect(subject.findInventorySetByCode(setCode, userId)).rejects.toThrow(`Set with code ${setCode} has no cards`);
        });

        it("should return set with inventory agg cards with quantity 0 if user not logged in", async () => {
            const invalidUserId = -1;
            jest.spyOn(mockInventoryService, "findAllCardsForUser").mockResolvedValueOnce([]);
            const result: InventorySetAggregateDto = await subject.findInventorySetByCode(setCode, invalidUserId);
            expect(result).toBeDefined();
            expect(result.cards.length).toBeGreaterThan(0);
            result.cards.forEach(card => {
                expect(card.variants.length).toEqual(0);
            });
        });

        it("should return set with inventory agg cards with quantity 0 if user has no inventory", async () => {
            jest.spyOn(mockInventoryService, "findAllCardsForUser").mockResolvedValueOnce([]);
            const result = await subject.findInventorySetByCode(setCode, userId);
            expect(result).toBeDefined();
            expect(result.cards.length).toBeGreaterThan(0);
            result.cards.forEach(card => {
                expect(card.variants.length).toEqual(0);
            });
        });

        it("should find set with cards and replace cards with inventory cards", async () => {
            const result = await subject.findInventorySetByCode(setCode, userId);
            expect(result).toBeDefined();
            expect(result.cards.length).toBeGreaterThan(0);
            result.cards.forEach((card: InventoryCardAggregateDto) => {
                expect(card.variants).toBeDefined();
            });
        });
    });
});
