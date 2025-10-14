import { Test, TestingModule } from "@nestjs/testing";
import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { CardService } from "src/core/card/card.service";
import { InventoryService } from "src/core/inventory/inventory.service";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
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
        type: "test",
    };

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
                    }
                },
                {
                    provide: InventoryService, useValue: {
                        findByCards: jest.fn(),
                        getUniqueOwnedCountByUserId: jest.fn(),
                    }
                },
                {
                    provide: CardService, useValue: {
                        findBySet: jest.fn(),
                        totalCardsInSet: jest.fn(),
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

            const result = await orchestrator.findSetList(mockAuthenticatedRequest, [], 1, 10);

            expect(result).toBeInstanceOf(SetListViewDto);
            expect(result.setList.length).toBe(1);
            expect(result.pagination.currentPage).toBe(1);
            expect(result.pagination.totalItems).toBe(1);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("returns error DTO on service failure", async () => {
            setService.findSets.mockRejectedValue(new Error("DB error"));

            await expect(
                orchestrator.findSetList(mockAuthenticatedRequest, [], 1, 10)
            ).rejects.toThrow("An unexpected error occurred");
        });

        it("handles empty set list", async () => {
            setService.findSets.mockResolvedValue([]);
            setService.totalSetsCount.mockResolvedValue(0);

            const result = await orchestrator.findSetList(mockAuthenticatedRequest, [], 1, 10);

            expect(result.setList.length).toBe(0);
            expect(result.pagination.totalItems).toBe(0);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });
    });

    describe("findBySetCode", () => {
        it("returns set details and paginated cards", async () => {
            setService.findByCode.mockResolvedValue({ ...mockSet, cards: [] });
            cardService.findBySet.mockResolvedValue([mockCard]);
            cardService.totalCardsInSet.mockResolvedValue(1);
            inventoryService.findByCards.mockResolvedValue([]);

            const result = await orchestrator.findBySetCode(mockAuthenticatedRequest, "TST", 1, 10);

            expect(result).toBeInstanceOf(SetViewDto);
            expect(result.set.cards.length).toBe(1);
            expect(result.pagination.totalItems).toBe(1);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("returns error if set not found", async () => {
            setService.findByCode.mockResolvedValue(null);

            await expect(
                orchestrator.findBySetCode(mockAuthenticatedRequest, "BAD", 1, 10)
            ).rejects.toThrow("Set with code BAD not found");
        });

        it("handles unauthenticated requests gracefully", async () => {
            const unauthReq = { user: null, isAuthenticated: () => false } as AuthenticatedRequest;
            setService.findByCode.mockResolvedValue({ ...mockSet, cards: [] });
            cardService.findBySet.mockResolvedValue([mockCard]);
            cardService.totalCardsInSet.mockResolvedValue(1);
            inventoryService.findByCards.mockResolvedValue([]);

            const result = await orchestrator.findBySetCode(unauthReq, "TST", 1, 10);

            expect(result.authenticated).toBe(false);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("returns error DTO on card service failure", async () => {
            setService.findByCode.mockResolvedValue({ ...mockSet, cards: [] });
            cardService.findBySet.mockRejectedValue(new Error("Card error"));

            await expect(
                orchestrator.findBySetCode(mockAuthenticatedRequest, "TST", 1, 10)
            ).rejects.toThrow("An unexpected error occurred");
        });
    });
});