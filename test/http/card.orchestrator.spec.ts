import { Test, TestingModule } from "@nestjs/testing";
import { CardService } from "src/core/card/card.service";
import { InventoryService } from "src/core/inventory/inventory.service";
import { Card } from "src/core/card/card.entity";
import { Inventory } from "src/core/inventory/inventory.entity";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { CardOrchestrator } from "src/adapters/http/card/card.orchestrator";
import { CardViewDto } from "src/adapters/http/card/dto/card.view.dto";

describe("CardOrchestrator", () => {
    let orchestrator: CardOrchestrator;
    let cardService: CardService;
    let inventoryService: InventoryService;

    const mockCardService = {
        findBySetCodeAndNumber: jest.fn(),
        findAllWithName: jest.fn(),
    };

    const mockInventoryService = {
        findForUser: jest.fn(),
    };

    const mockAuthenticatedRequest = {
        user: {
            id: 1,
            name: "Test User",
        },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockCard = {
        id: "card1",
        name: "Lightning Bolt",
        setCode: "TST",
        setNumber: "001",
        setName: "Test Set",
    } as Card;

    const mockOtherPrintings = [
        {
            id: "card2",
            name: "Lightning Bolt",
            setCode: "M10",
            setNumber: "149",
            setName: "Magic 2010",
        } as Card,
        {
            id: "card3",
            name: "Lightning Bolt",
            setCode: "LRW",
            setNumber: "278",
            setName: "Lorwyn",
        } as Card,
    ];

    const mockInventory = [
        {
            id: "inv1",
            userId: 1,
            cardId: "card1",
            quantity: 3,
            isFoil: false,
        } as Inventory,
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("findSetCard", () => {
        it("should return card view with card and other printings", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findAllWithName.mockResolvedValue([mockCard, ...mockOtherPrintings]);
            mockInventoryService.findForUser.mockResolvedValue(mockInventory);

            const result: CardViewDto = await orchestrator.findSetCard("TST", "001", mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.card).toBeDefined();
            expect(result.card.name).toBe("Lightning Bolt");
            expect(result.otherPrintings).toHaveLength(2);
            expect(result.status).toBe(ActionStatus.SUCCESS);

            expect(cardService.findBySetCodeAndNumber).toHaveBeenCalledWith("TST", "001");
            expect(cardService.findAllWithName).toHaveBeenCalledWith("Lightning Bolt");
            expect(inventoryService.findForUser).toHaveBeenCalledWith(1, "card1");
        });

        it("should throw error when card not found", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(null);

            await expect(
                orchestrator.findSetCard("INVALID", "999", mockAuthenticatedRequest)
            ).rejects.toThrow("Card with set code INVALID and number 999 not found");
        });

        it("should handle unauthenticated requests", async () => {
            const unauthenticatedReq = {
                user: null,
                isAuthenticated: () => false
            } as AuthenticatedRequest;

            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findAllWithName.mockResolvedValue([mockCard, ...mockOtherPrintings]);

            const result: CardViewDto = await orchestrator.findSetCard("TST", "001", unauthenticatedReq);

            expect(result.authenticated).toBe(false);
            expect(result.card).toBeDefined();
            expect(inventoryService.findForUser).not.toHaveBeenCalled();
        });

        it("should handle no other printings case", async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findAllWithName.mockResolvedValue([mockCard]);
            mockInventoryService.findForUser.mockResolvedValue(mockInventory);

            const result: CardViewDto = await orchestrator.findSetCard("TST", "001", mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.otherPrintings).toHaveLength(0);
        });
    });
});