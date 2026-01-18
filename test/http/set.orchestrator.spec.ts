import { Test, TestingModule } from "@nestjs/testing";
import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { CardService } from "src/core/card/card.service";
import { InventoryService } from "src/core/inventory/inventory.service";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { Set } from "src/core/set/set.entity";
import { SetPrice } from "src/core/set/set-price.entity";
import { SetService } from "src/core/set/set.service";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { SetListViewDto } from "src/http/set/dto/set-list.view.dto";
import { SetViewDto } from "src/http/set/dto/set.view.dto";
import { SetOrchestrator } from "src/http/set/set.orchestrator";

describe("SetOrchestrator", () => {
    let orchestrator: SetOrchestrator;
    let setService: jest.Mocked<SetService>;
    let inventoryService: jest.Mocked<InventoryService>;
    let cardService: jest.Mocked<CardService>;

    const mockAuthenticatedRequest = {
        user: { id: 1, name: "Test User" },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockSet: Set = {
        code: "TST",
        baseSize: 2,
        keyruneCode: "TST",
        name: "Test Set",
        releaseDate: String(new Date()),
        cards: [],
        totalSize: 2,
        type: "test",
    };

    const mockQueryOptions = new SafeQueryOptions({ page: 1, limit: 10, filter: "test" });

    const mockCard: Card = {
        id: "card1",
        name: "Test Card",
        setCode: "TST",
        number: "1",
        hasFoil: true,
        hasNonFoil: true,
        imgSrc: "https://example.com/card1.png",
        isReserved: false,
        rarity: CardRarity.Common,
        manaCost: "{1}{G}",
        oracleText: "Test oracle text",
        type: "Test",
        legalities: [],
        isAlternative: false,
        sortNumber: "000001",
        inMain: true,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetOrchestrator,
                {
                    provide: SetService, useValue: {
                        findSets: jest.fn(),
                        totalSetsCount: jest.fn(),
                        findByCode: jest.fn(),
                        totalCardsInSet: jest.fn(),
                        totalValueForSet: jest.fn(),
                    }
                },
                {
                    provide: InventoryService, useValue: {
                        findByCards: jest.fn(),
                        getUniqueOwnedCountByUserId: jest.fn(),
                        totalValueForSet: jest.fn(),
                        totalInventoryItemsForSet: jest.fn(),
                        ownedValueForSet: jest.fn(),
                    }
                },
                {
                    provide: CardService, useValue: {
                        findBySet: jest.fn(),
                        totalCardsInSet: jest.fn(),
                        totalValueForSet: jest.fn(),
                    }
                },
            ],
        }).compile();

        orchestrator = module.get(SetOrchestrator);
        setService = module.get(SetService) as jest.Mocked<SetService>;
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
        cardService = module.get(CardService) as jest.Mocked<CardService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("findSetList", () => {
        it("returns paginated sets and pagination info", async () => {
            setService.findSets.mockResolvedValue([mockSet]);
            setService.totalSetsCount.mockResolvedValue(1);
            inventoryService.totalInventoryItemsForSet.mockResolvedValue(0);
            inventoryService.ownedValueForSet.mockResolvedValue(0);

            const result = await orchestrator.findSetList(mockAuthenticatedRequest, [], mockQueryOptions);

            expect(result).toBeInstanceOf(SetListViewDto);
            expect(result.setList.length).toBe(1);
            expect(result.pagination.current).toBe(1);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("returns error DTO on service failure", async () => {
            setService.findSets.mockRejectedValue(new Error("DB error"));

            await expect(
                orchestrator.findSetList(mockAuthenticatedRequest, [], mockQueryOptions)
            ).rejects.toThrow("An unexpected error occurred");
        });

        it("handles empty set list", async () => {
            setService.findSets.mockResolvedValue([]);
            setService.totalSetsCount.mockResolvedValue(0);

            const result = await orchestrator.findSetList(mockAuthenticatedRequest, [], mockQueryOptions);

            expect(result.setList.length).toBe(0);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });
    });

    describe("findBySetCode", () => {
        it("returns set details and paginated cards", async () => {
            setService.findByCode.mockResolvedValue({ ...mockSet, cards: [] });
            cardService.findBySet.mockResolvedValue([mockCard]);
            setService.totalCardsInSet.mockResolvedValue(1);
            inventoryService.findByCards.mockResolvedValue([]);
            inventoryService.totalInventoryItemsForSet.mockResolvedValue(0);
            inventoryService.ownedValueForSet.mockResolvedValue(0);

            const result = await orchestrator.findBySetCode(mockAuthenticatedRequest, "TST", mockQueryOptions);

            expect(result).toBeInstanceOf(SetViewDto);
            expect(result.set.cards.length).toBe(1);
            expect(result.pagination.current).toBe(1);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("returns error if set not found", async () => {
            setService.findByCode.mockResolvedValue(null);

            await expect(
                orchestrator.findBySetCode(mockAuthenticatedRequest, "BAD", mockQueryOptions)
            ).rejects.toThrow("Set with code BAD not found");
        });

        it("handles unauthenticated requests gracefully", async () => {
            const unauthReq = { user: null, isAuthenticated: () => false } as AuthenticatedRequest;
            setService.findByCode.mockResolvedValue({ ...mockSet, cards: [] });
            cardService.findBySet.mockResolvedValue([mockCard]);
            setService.totalCardsInSet.mockResolvedValue(1);
            inventoryService.findByCards.mockResolvedValue([]);
            inventoryService.totalInventoryItemsForSet.mockResolvedValue(0);
            inventoryService.ownedValueForSet.mockResolvedValue(0);

            const result = await orchestrator.findBySetCode(unauthReq, "TST", mockQueryOptions);

            expect(result.authenticated).toBe(false);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("returns error DTO on card service failure", async () => {
            setService.findByCode.mockResolvedValue({ ...mockSet, cards: [] });
            cardService.findBySet.mockRejectedValue(new Error("Card error"));

            await expect(
                orchestrator.findBySetCode(mockAuthenticatedRequest, "TST", mockQueryOptions)
            ).rejects.toThrow("An unexpected error occurred");
        });
    });

    describe("createSetPriceDto - Price filtering and defaultPrice selection", () => {
        it("should handle all prices as zero", () => {
            const prices = createMockSetPrice({
                basePrice: 0,
                basePriceAll: 0,
                totalPrice: 0,
                totalPriceAll: 0,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(0);
            expect(result.defaultPrice).toBe("-");
            expect(result.basePriceNormal).toBeNull();
            expect(result.basePriceAll).toBeNull();
            expect(result.totalPriceNormal).toBeNull();
            expect(result.totalPriceAll).toBeNull();
        });

        it("should handle null/undefined prices", () => {
            const prices = createMockSetPrice({
                basePrice: null,
                basePriceAll: null,
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(0);
            expect(result.defaultPrice).toBe("-");
            expect(result.basePriceNormal).toBeNull();
            expect(result.basePriceAll).toBeNull();
            expect(result.totalPriceNormal).toBeNull();
            expect(result.totalPriceAll).toBeNull();
        });

        it("should handle null SetPrice input", () => {
            const result = orchestrator.createSetPriceDto(null);

            expect(result.gridCols).toBe(0);
            expect(result.defaultPrice).toBe("-");
        });

        it("should select basePriceNormal as default when only price available", () => {
            const prices = createMockSetPrice({
                basePrice: 100.50,
                basePriceAll: null,
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(1);
            expect(result.defaultPrice).toBe("$100.50");
            expect(result.basePriceNormal).toBe("$100.50");
        });

        it("should select basePriceNormal as default when all prices available (last in order)", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: 200.00,
                totalPrice: 150.00,
                totalPriceAll: 300.00,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(4);
            expect(result.defaultPrice).toBe("$100.00"); // basePriceNormal set last
            expect(result.basePriceNormal).toBe("$100.00");
            expect(result.basePriceAll).toBe("$200.00");
            expect(result.totalPriceNormal).toBe("$150.00");
            expect(result.totalPriceAll).toBe("$300.00");
        });

        it("should select basePriceAll when basePriceNormal not available", () => {
            const prices = createMockSetPrice({
                basePrice: null,
                basePriceAll: 200.00,
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(1);
            expect(result.defaultPrice).toBe("$200.00");
            expect(result.basePriceAll).toBe("$200.00");
        });

        it("should select totalPriceNormal when base prices not available", () => {
            const prices = createMockSetPrice({
                basePrice: null,
                basePriceAll: null,
                totalPrice: 150.00,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(1);
            expect(result.defaultPrice).toBe("$150.00");
            expect(result.totalPriceNormal).toBe("$150.00");
        });

        it("should filter out totalPriceAll when equal to totalPrice", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: 200.00,
                totalPrice: 150.00,
                totalPriceAll: 150.00, // Same as totalPrice
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(3);
            expect(result.totalPriceAll).toBeNull();
            expect(result.totalPriceNormal).toBe("$150.00");
        });

        it("should filter out totalPriceAll when equal to basePriceAll", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: 200.00,
                totalPrice: 150.00,
                totalPriceAll: 200.00, // Same as basePriceAll
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(3);
            expect(result.totalPriceAll).toBeNull();
            expect(result.basePriceAll).toBe("$200.00");
        });

        it("should filter out totalPrice when equal to basePrice", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: null,
                totalPrice: 100.00, // Same as basePrice
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(1);
            expect(result.totalPriceNormal).toBeNull();
            expect(result.basePriceNormal).toBe("$100.00");
        });

        it("should filter out basePriceAll when equal to basePrice", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: 100.00, // Same as basePrice
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(1);
            expect(result.basePriceAll).toBeNull();
            expect(result.basePriceNormal).toBe("$100.00");
        });

        it("should handle scenario with only foil prices", () => {
            const prices = createMockSetPrice({
                basePrice: null,
                basePriceAll: 500.00,
                totalPrice: null,
                totalPriceAll: 750.00,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(2);
            expect(result.defaultPrice).toBe("$500.00"); // basePriceAll set last
            expect(result.basePriceNormal).toBeNull();
            expect(result.basePriceAll).toBe("$500.00");
            expect(result.totalPriceNormal).toBeNull();
            expect(result.totalPriceAll).toBe("$750.00");
        });

        it("should calculate gridCols correctly with mixed null and valid prices", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: null,
                totalPrice: 150.00,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(2);
        });

        it("should handle decimal prices correctly with toDollar formatting", () => {
            const prices = createMockSetPrice({
                basePrice: 99.99,
                basePriceAll: 199.99,
                totalPrice: 149.99,
                totalPriceAll: 299.99,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.basePriceNormal).toBe("$99.99");
            expect(result.basePriceAll).toBe("$199.99");
            expect(result.totalPriceNormal).toBe("$149.99");
            expect(result.totalPriceAll).toBe("$299.99");
        });

        it("should handle string prices from database", () => {
            const prices = createMockSetPrice({
                basePrice: "100.50",
                basePriceAll: "200.75",
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(2);
            expect(result.basePriceNormal).toBe("$100.50");
            expect(result.basePriceAll).toBe("$200.75");
        });

        it("should preserve lastUpdate date", () => {
            const lastUpdate = new Date("2026-01-14");
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: null,
                totalPrice: null,
                totalPriceAll: null,
                lastUpdate,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.lastUpdate).toEqual(lastUpdate);
        });

        it("should handle all prices the same value", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: 100.00,
                totalPrice: 100.00,
                totalPriceAll: 100.00,
            });

            const result = orchestrator.createSetPriceDto(prices);

            // All duplicates filtered, only basePrice remains
            expect(result.gridCols).toBe(1);
            expect(result.basePriceNormal).toBe("$100.00");
            expect(result.basePriceAll).toBeNull();
            expect(result.totalPriceNormal).toBeNull();
            expect(result.totalPriceAll).toBeNull();
        });

        it("should handle very small decimal values", () => {
            const prices = createMockSetPrice({
                basePrice: 0.01,
                basePriceAll: 0.02,
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(2);
            expect(result.basePriceNormal).toBe("$0.01");
            expect(result.basePriceAll).toBe("$0.02");
        });

        it("should handle very large decimal values with thousands separator", () => {
            const prices = createMockSetPrice({
                basePrice: 9999.99,
                basePriceAll: 19999.99,
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(2);
            expect(result.basePriceNormal).toBe("$9,999.99");
            expect(result.basePriceAll).toBe("$19,999.99");
        });

        it("should format prices over one million with commas", () => {
            const prices = createMockSetPrice({
                basePrice: 1234567.89,
                basePriceAll: null,
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.gridCols).toBe(1);
            expect(result.basePriceNormal).toBe("$1,234,567.89");
            expect(result.defaultPrice).toBe("$1,234,567.89");
        });

        it("should handle prices with exactly two decimal places", () => {
            const prices = createMockSetPrice({
                basePrice: 100.00,
                basePriceAll: null,
                totalPrice: null,
                totalPriceAll: null,
            });

            const result = orchestrator.createSetPriceDto(prices);

            expect(result.basePriceNormal).toBe("$100.00");
        });
    });

    // Helper function to create mock SetPrice
    function createMockSetPrice(priceData: Partial<{
        basePrice: number | string | null;
        basePriceAll: number | string | null;
        totalPrice: number | string | null;
        totalPriceAll: number | string | null;
        lastUpdate: Date;
    }>): SetPrice {
        const toNumber = (val: number | string | null): number | null => {
            if (val === null || val === undefined) return null;
            return typeof val === "string" ? parseFloat(val) : val;
        };

        return new SetPrice({
            setCode: "TST",
            basePrice: toNumber(priceData.basePrice),
            basePriceAll: toNumber(priceData.basePriceAll),
            totalPrice: toNumber(priceData.totalPrice),
            totalPriceAll: toNumber(priceData.totalPriceAll),
            lastUpdate: priceData.lastUpdate ?? new Date(),
        });
    }
});