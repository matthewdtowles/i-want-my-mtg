import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { InventoryViewDto } from "src/http/inventory/dto/inventory.view.dto";
import { InventoryOrchestrator } from "src/http/inventory/inventory.orchestrator";


describe("InventoryOrchestrator", () => {
    let orchestrator: InventoryOrchestrator;
    let inventoryService: jest.Mocked<InventoryService>;

    const mockAuthenticatedRequest = {
        user: { id: 1, name: "Test User", email: "test@example.com" },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryOrchestrator,
                {
                    provide: InventoryService, useValue: {
                        findAllForUser: jest.fn(),
                        totalInventoryItemsForUser: jest.fn(),
                        save: jest.fn(),
                        delete: jest.fn(),
                    }
                },
            ],
        }).compile();

        orchestrator = module.get(InventoryOrchestrator);
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("findByUser", () => {
        it("returns inventory view with items and pagination", async () => {
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
                prices: [],
            };
            inventoryService.findAllForUser.mockResolvedValue([
                {
                    userId: 1,
                    cardId: "card1",
                    quantity: 2,
                    isFoil: false,
                    card: mockCard,
                } as Inventory,
            ]);
            inventoryService.totalInventoryItemsForUser.mockResolvedValue(1);

            const result: InventoryViewDto = await orchestrator.findByUser(mockAuthenticatedRequest, 1, 10);

            expect(result.cards.length).toBe(1);
            expect(result.pagination.currentPage).toBe(1);
            expect(result.pagination.totalItems).toBe(1);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("returns empty inventory view when user has no items", async () => {
            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalInventoryItemsForUser.mockResolvedValue(0);

            const result: InventoryViewDto = await orchestrator.findByUser(mockAuthenticatedRequest, 1, 10);

            expect(result.cards).toHaveLength(0);
            expect(result.pagination.totalItems).toBe(0);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });

        it("throws error if not authenticated", async () => {
            const unauthenticatedRequest = { user: null, isAuthenticated: () => false } as AuthenticatedRequest;

            await expect(orchestrator.findByUser(unauthenticatedRequest, 1, 10)).rejects.toThrow();
        });

    });

    describe("save", () => {
        it("saves inventory items and returns them", async () => {
            const mockInventoryItems: Inventory[] = [
                { userId: 1, cardId: "card1", quantity: 2, isFoil: false } as Inventory,
            ];
            inventoryService.save.mockResolvedValue(mockInventoryItems);

            const result = await orchestrator.save([
                { cardId: "card1", quantity: 2, isFoil: false, userId: 1 }
            ], mockAuthenticatedRequest);

            expect(result).toEqual(mockInventoryItems);
            expect(inventoryService.save).toHaveBeenCalledTimes(1);
        });

        it("throws error if request is not authenticated", async () => {
            const unauthenticatedRequest = { user: null, isAuthenticated: () => false } as AuthenticatedRequest;

            await expect(
                orchestrator.save([{ cardId: "card1", quantity: 2, isFoil: false, userId: 1 }], unauthenticatedRequest)
            ).rejects.toThrow();
        });

        it("returns error DTO on service failure", async () => {
            inventoryService.save.mockRejectedValue(new Error("DB error"));

            await expect(
                orchestrator.save([
                    { cardId: "card1", quantity: 2, isFoil: false, userId: 1 }
                ], mockAuthenticatedRequest)
            ).rejects.toThrow("An unexpected error occurred");
        });
    });

    describe("delete", () => {
        it("deletes inventory item and returns true", async () => {
            inventoryService.delete.mockResolvedValue(true);

            const result = await orchestrator.delete(mockAuthenticatedRequest, "card1", false);

            expect(result).toBe(true);
            expect(inventoryService.delete).toHaveBeenCalledWith(
                mockAuthenticatedRequest.user.id,
                "card1",
                false
            );
        });

        it("throws BadRequestException if cardId is missing", async () => {
            await expect(
                orchestrator.delete(mockAuthenticatedRequest, null, false)
            ).rejects.toThrow(BadRequestException);
            expect(inventoryService.delete).not.toHaveBeenCalled();
        });

        it("throws error if request is not authenticated", async () => {
            const unauthenticatedRequest = { user: null, isAuthenticated: () => false } as AuthenticatedRequest;

            await expect(
                orchestrator.delete(unauthenticatedRequest, "card1", false)
            ).rejects.toThrow();
        });

        it("returns error DTO on service failure", async () => {
            inventoryService.delete.mockRejectedValue(new Error("DB error"));

            await expect(
                orchestrator.delete(mockAuthenticatedRequest, "card1", false)
            ).rejects.toThrow("An unexpected error occurred");
        });
    });
});