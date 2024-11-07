import { Test, TestingModule } from "@nestjs/testing";
import { AggregatorService } from "src/core/aggregator/aggregator.service";
import { InventoryCardAggregateDto, InventorySetAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { CardDto } from "src/core/card/api/card.dto";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { SetServicePort } from "src/core/set/api/set.service.port";
import { TestUtils } from "../../test-utils";

describe("AggregatorService", () => {
    let subject: AggregatorService;
    const testUtils: TestUtils = new TestUtils();
    const setCode = testUtils.MOCK_SET_CODE;
    const set = testUtils.getMockSetWithCards(setCode);
    const userId = testUtils.MOCK_USER_ID;
    const mockCardService: CardServicePort = {
        save: jest.fn(),
        findAllInSet: jest.fn().mockResolvedValue(testUtils.getMockCardDtos(setCode)),
        findAllWithName: jest.fn(),
        findById: jest.fn().mockResolvedValue(testUtils.getMockCardDtos(setCode)[0]),
        findBySetCodeAndNumber: jest.fn().mockResolvedValue(testUtils.getMockCardDtos(setCode)[0]),
        findByUuid: jest.fn(),
    };
    const mockSetService: SetServicePort = {
        findByCode: jest.fn().mockResolvedValue(testUtils.getMockSetWithCards(setCode)),
        findAll: jest.fn(),
        findAllInFormat: jest.fn(),
        save: jest.fn(),
    };
    const mockInventoryService: InventoryServicePort = {
        findAllForUser: jest.fn().mockResolvedValue(testUtils.getMockInventoryDtos()),
        findAllCardsForUser: jest.fn().mockResolvedValue(testUtils.getMockInventoryCardDtos()),
        create: jest.fn(),
        update: jest.fn(),
        findOneForUser: jest.fn().mockResolvedValue(testUtils.getMockInventoryDtos()[0]),
        findOneCardForUser: jest.fn().mockResolvedValue(testUtils.getMockInventoryCardDtos()[0]),
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

    it("should be defined", () => {
        expect(subject).toBeDefined();
    });

    describe("findInventorySetByCode", () => {
        it("should throw error if set not found", async () => {
            const invalidSetCode = "INVALID";
            jest.spyOn(mockSetService, "findByCode").mockResolvedValueOnce(null);
            await expect(subject.findInventorySetByCode(invalidSetCode, userId)).rejects.toThrow(`Set with code ${invalidSetCode} not found`);
        });

        it("should throw error if set found but has no cards", async () => {
            jest.spyOn(mockSetService, "findByCode").mockResolvedValueOnce(testUtils.getMockSetDto(setCode));
            await expect(subject.findInventorySetByCode(setCode, userId)).rejects.toThrow(`Set with code ${setCode} has no cards`);
        });

        it("should return set with inventory agg cards with quantity 0 if user not logged in", async () => {
            const invalidUserId = -1;
            jest.spyOn(mockInventoryService, "findAllCardsForUser").mockResolvedValueOnce([]);
            const result: InventorySetAggregateDto = await subject.findInventorySetByCode(setCode, invalidUserId);
            expect(result).toBeDefined();
            expect(result.cards).toHaveLength(set.cards.length);
            result.cards.forEach(card => {
                expect(card.quantity).toBeGreaterThanOrEqual(0);
            });
        });

        it("should return set with inventory agg cards with quantity 0 if user has no inventory", async () => {
            jest.spyOn(mockInventoryService, "findAllCardsForUser").mockResolvedValueOnce([]);
            const result = await subject.findInventorySetByCode(setCode, userId);
            expect(result).toBeDefined();
            expect(result.cards).toHaveLength(set.cards.length);
            result.cards.forEach(card => {
                expect(card.quantity).toBeGreaterThanOrEqual(0);
            });
        });

        it("should find set with cards and replace cards with inventory cards", async () => {
            const userId = testUtils.MOCK_USER_ID;
            const result = await subject.findInventorySetByCode(setCode, userId);
            expect(result).toBeDefined();
            expect(result.cards).toHaveLength(set.cards.length);
            result.cards.forEach((card: InventoryCardAggregateDto) => {
                expect(card.quantity).toBeDefined();
                // cards with even IDs had quantity set to 0
                if (card.id % 2 === 0) {
                    expect(card.quantity).toBe(0);
                } else {
                    expect(card.quantity).toBe(testUtils.MOCK_QUANTITY);
                }
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
            jest.spyOn(mockInventoryService, "findOneForUser").mockResolvedValueOnce(null);
            const card: CardDto = testUtils.getMockCardDtos(setCode)[0];
            const expectedCard: InventoryCardAggregateDto = {
                ...card,
                quantity: 0,
            };
            await expect(subject.findInventoryCardById(cardId, -1)).resolves.toEqual(expectedCard);
        });

        it("should return inventory card with quantity 0 if no inventory item found", async () => {
            jest.spyOn(mockInventoryService, "findOneForUser").mockResolvedValueOnce(null);
            const card: CardDto = testUtils.getMockCardDtos(setCode)[0];
            const expectedCard: InventoryCardAggregateDto = {
                ...card,
                quantity: 0,
            };
            await expect(subject.findInventoryCardById(cardId, userId)).resolves.toEqual(expectedCard);
        });

        it("should return inventory card with quantity if inventory item found", async () => {
            const card: CardDto = testUtils.getMockCardDtos(setCode)[0];
            const expectedCard: InventoryCardAggregateDto = {
                ...card,
                quantity: 4,
            };
            await expect(subject.findInventoryCardById(cardId, userId)).resolves.toEqual(expectedCard);
        });
    });

    describe("findInventoryCardBySetNumber", () => {
        const cardNumber = 1;
        it("should throw error if card not found", async () => {
            jest.spyOn(mockCardService, "findBySetCodeAndNumber").mockResolvedValueOnce(null);
            await expect(subject.findInventoryCardBySetNumber(setCode, cardNumber, userId))
                .rejects.toThrow(`Card #${cardNumber} in set ${setCode} not found`);
        });

        it("should return inventory card with quantity 0 if userId invalid", async () => {
            jest.spyOn(mockInventoryService, "findOneForUser").mockResolvedValueOnce(null);
            const card: CardDto = testUtils.getMockCardDtos(setCode)[0];
            const expectedCard: InventoryCardAggregateDto = {
                ...card,
                quantity: 0,
            };
            await expect(subject.findInventoryCardBySetNumber(setCode, cardNumber, -1))
                .resolves.toEqual(expectedCard);
        });

        it("should return inventory card with quantity 0 if no inventory item found", async () => {
            jest.spyOn(mockInventoryService, "findOneForUser").mockResolvedValueOnce(null);
            const card: CardDto = testUtils.getMockCardDtos(setCode)[0];
            const expectedCard: InventoryCardAggregateDto = {
                ...card,
                quantity: 0,
            };
            await expect(subject.findInventoryCardBySetNumber(setCode, cardNumber, userId))
                .resolves.toEqual(expectedCard);
        });

        it("should return inventory card with quantity if inventory item found", async () => {
            const card: CardDto = testUtils.getMockCardDtos(setCode)[0];
            const expectedCard: InventoryCardAggregateDto = {
                ...card,
                quantity: 4,
            };
            await expect(subject.findInventoryCardBySetNumber(setCode, cardNumber, userId))
                .resolves.toEqual(expectedCard);

        });
    });
});
