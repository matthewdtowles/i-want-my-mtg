import { Test, TestingModule } from "@nestjs/testing";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { CardOrchestrator } from "src/http/card/card.orchestrator";
import { CardViewDto } from "src/http/card/dto/card.view.dto";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { CardService } from "src/core/card/card.service";
import { InventoryService } from "src/core/inventory/inventory.service";

jest.mock("src/http/http.error.handler");

describe("CardOrchestrator", () => {
    let orchestrator: CardOrchestrator;
    let cardService: CardService;
    let inventoryService: InventoryService;

    const mockCardService = {
        findBySetCodeAndNumber: jest.fn(),
        findWithName: jest.fn(), // FIX: was findAllWithName
        totalWithName: jest.fn(),
    };

    const mockInventoryService = {
        findForUser: jest.fn(),
    };

    const mockHttpErrorHandler = {
        toHttpException: jest.fn(),
    };

    const mockAuthenticatedRequest = {
        user: {
            id: 1,
            name: "Test User",
        },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockCard: Card = new Card({
        id: "card1",
        imgSrc: "https://example.com/card1.png",
        legalities: [],
        name: "Lightning Bolt",
        setCode: "TST",
        number: "001",
        manaCost: "{R}",
        type: "Instant",
        rarity: CardRarity.Common,
        artist: "Christopher Rush",
        prices: [],
    });

    const mockOtherPrintingCard: Card = new Card({
        id: "card2",
        imgSrc: "https://example.com/card2.png",
        legalities: [],
        name: "Lightning Bolt",
        setCode: "M10",
        number: "149",
        manaCost: "{R}",
        type: "Instant",
        rarity: CardRarity.Common,
        artist: "Christopher Rush",
        prices: [],
    });

    const mockInventory = [
        {
            id: "inv1",
            userId: 1,
            cardId: "card1",
            quantity: 3,
            isFoil: false,
        },
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardOrchestrator,
                {
                    provide: CardService,
                    useValue: mockCardService,
                },
                {
                    provide: InventoryService,
                    useValue: mockInventoryService,
                },
            ],
        }).compile();

        orchestrator = module.get<CardOrchestrator>(CardOrchestrator);
        cardService = module.get<CardService>(CardService);
        inventoryService = module.get<InventoryService>(InventoryService);

        // Setup HttpErrorHandler mock
        (HttpErrorHandler.toHttpException as unknown as jest.Mock) = mockHttpErrorHandler.toHttpException;
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Reset all mock implementations
        mockCardService.findBySetCodeAndNumber.mockReset();
        mockCardService.findWithName.mockReset();
        mockInventoryService.findForUser.mockReset();
        mockHttpErrorHandler.toHttpException.mockReset();
    });

    describe("findSetCard", () => {
        it("should return card view with card and other printings", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);
            mockInventoryService.findForUser.mockResolvedValue(mockInventory);

            const result: CardViewDto = await orchestrator.findSetCard(mockAuthenticatedRequest, "TST", "001", 1, 10);

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.card).toBeDefined();
            expect(result.card.name).toBe("Lightning Bolt");
            expect(result.card.setCode).toBe("TST");
            expect(result.card.number).toBe("001");
            expect(result.otherPrintings).toHaveLength(1); // Only other printings, not the current card
            expect(result.otherPrintings[0].setCode).toBe("M10");
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(result.message).toBe("Card found");
            expect(result.breadcrumbs).toHaveLength(4);
            expect(result.breadcrumbs[3].label).toBe("Lightning Bolt");

            expect(cardService.findBySetCodeAndNumber).toHaveBeenCalled();
            expect(cardService.findWithName).toHaveBeenCalled();
            expect(inventoryService.findForUser).toHaveBeenCalled();
        });

        it("should throw error when card not found", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(null);
            const notFoundError = new Error("Card with set code INVALID and number 999 not found");
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw notFoundError;
            });

            await expect(
                orchestrator.findSetCard(mockAuthenticatedRequest, "INVALID", "999", 1, 10)
            ).rejects.toThrow("Card with set code INVALID and number 999 not found");

            expect(cardService.findBySetCodeAndNumber).toHaveBeenCalledWith("INVALID", "999");
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Card with set code INVALID and number 999 not found"
                }),
                "findSetCard"
            );
        });

        it("should handle unauthenticated requests", async () => {
            const unauthenticatedReq = {
                user: null,
                isAuthenticated: () => false
            } as AuthenticatedRequest;

            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);

            const result: CardViewDto = await orchestrator.findSetCard(unauthenticatedReq, "TST", "001", 1, 10);

            expect(result.authenticated).toBe(false);
            expect(result.card).toBeDefined();
            expect(result.card.name).toBe("Lightning Bolt");
            expect(inventoryService.findForUser).not.toHaveBeenCalled();
        });

        it("should handle no other printings case", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard]); // Only current card
            mockInventoryService.findForUser.mockResolvedValue(mockInventory);

            const result: CardViewDto = await orchestrator.findSetCard(mockAuthenticatedRequest, "TST", "001", 1, 10);

            expect(result).toBeDefined();
            expect(result.otherPrintings).toHaveLength(0); // No other printings
            expect(result.card.name).toBe("Lightning Bolt");
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("should handle empty inventory", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);
            mockInventoryService.findForUser.mockResolvedValue([]); // Empty inventory

            const result: CardViewDto = await orchestrator.findSetCard(mockAuthenticatedRequest, "TST", "001", 1, 10);

            expect(result).toBeDefined();
            expect(result.card).toBeDefined();
            expect(result.card.name).toBe("Lightning Bolt");
            expect(result.otherPrintings).toHaveLength(1);
            expect(inventoryService.findForUser).toHaveBeenCalledWith(1, "card1");
        });

        it("should handle service errors", async () => {
            const serviceError = new Error("Database connection failed");
            mockCardService.findBySetCodeAndNumber.mockRejectedValue(serviceError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw serviceError;
            });

            await expect(
                orchestrator.findSetCard(mockAuthenticatedRequest, "TST", "001", 1, 10)
            ).rejects.toThrow("Database connection failed");

            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(serviceError, "findSetCard");
        });

        it("should handle inventory service errors gracefully", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);
            const inventoryError = new Error("Inventory service failed");
            mockInventoryService.findForUser.mockRejectedValue(inventoryError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw inventoryError;
            });

            await expect(
                orchestrator.findSetCard(mockAuthenticatedRequest, "TST", "001", 1, 10)
            ).rejects.toThrow("Inventory service failed");

            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(inventoryError, "findSetCard");
        });

        it("should create correct breadcrumbs", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard]);
            mockInventoryService.findForUser.mockResolvedValue([]);

            const result: CardViewDto = await orchestrator.findSetCard(mockAuthenticatedRequest, "TST", "001", 1, 10);

            expect(result.breadcrumbs).toEqual([
                { label: "Home", url: "/" },
                { label: "Sets", url: "/sets" },
                { label: "TST", url: "/sets/TST" },
                { label: "Lightning Bolt", url: "/card/TST/001" },
            ]);
        });
    });
});