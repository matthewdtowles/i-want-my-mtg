import { Test, TestingModule } from "@nestjs/testing";
import { AggregatorService } from "src/core/aggregator/aggregator.service";
import { InventoryCardAggregateDto, InventorySetAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { CardDto } from "src/core/card/api/card.dto";
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
    const mockCardDtos: CardDto[] = testUtils.mockCardDtos(setCode);
    const mockCardService: CardServicePort = {
        save: jest.fn(),
        findAllWithName: jest.fn(),
        findById: jest.fn().mockResolvedValue(mockCardDtos[0]),
        findBySetCodeAndNumber: jest.fn().mockResolvedValue(mockCardDtos[0]),
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

    describe("findInventoryCardById", () => {
        const cardId = 1;
        it("should throw error if card with cardId not found", async () => {
            jest.spyOn(mockCardService, "findById").mockResolvedValueOnce(null);
            await expect(subject.findInventoryCardById(cardId, userId))
                .rejects.toThrow(`Card with id ${cardId} not found`);
        });

        it("should return inventory card with quantity 0 if userId invalid", async () => {
            jest.spyOn(mockInventoryService, "findForUser").mockResolvedValueOnce([]);
            const result: InventoryCardAggregateDto = await subject.findInventoryCardById(cardId, -1);

            expect(result.variants.length).toBeGreaterThan(0);
            result.variants.forEach(variant => {
                expect(variant.quantity).toBe(0);
            });
        });

        it("should return inventory card with quantity 0 if no inventory item found", async () => {
            jest.spyOn(mockInventoryService, "findForUser").mockResolvedValueOnce([]);
            const result: InventoryCardAggregateDto = await subject.findInventoryCardById(cardId, userId);
            expect(result.variants.length).toBeGreaterThan(0);
            result.variants.forEach(variant => {
                expect(variant.quantity).toBe(0);
            });
        });
    });

    describe("findInventoryCardBySetNumber", () => {
        const cardNumber: string = "1";
        it("should throw error if card not found", async () => {
            jest.spyOn(mockCardService, "findBySetCodeAndNumber").mockResolvedValueOnce(null);
            await expect(subject.findInventoryCardBySetNumber(setCode, cardNumber, userId))
                .rejects.toThrow(`Card #${cardNumber} in set ${setCode} not found`);
        });

        it("should return inventory card with quantity 0 if userId invalid", async () => {
            jest.spyOn(mockInventoryService, "findForUser").mockResolvedValueOnce([]);
            const result: InventoryCardAggregateDto = await subject.findInventoryCardBySetNumber(setCode, cardNumber, -1);
            expect(result.variants.length).toBeGreaterThan(0);
            result.variants.forEach(variant => {
                expect(variant.quantity).toBe(0);
            });
        });

        it("should return inventory card with quantity 0 if no inventory item found", async () => {
            jest.spyOn(mockInventoryService, "findForUser").mockResolvedValueOnce([]);
            const result: InventoryCardAggregateDto = await subject.findInventoryCardBySetNumber(setCode, cardNumber, -1);
            expect(result.variants.length).toBeGreaterThan(0);
            result.variants.forEach(variant => {
                expect(variant.quantity).toBe(0);
            });
        });

        it("should return inventory card with quantity if inventory item found", async () => {
            const result: InventoryCardAggregateDto = await subject.findInventoryCardBySetNumber(setCode, cardNumber, userId);
            expect(result.variants.length).toBeGreaterThan(0);
            result.variants.forEach(variant => {
                expect(variant.quantity).toBeGreaterThan(0);
            });
        });
    });
});
