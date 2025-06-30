import { BadRequestException, Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { InventoryRequestDto } from "src/adapters/http/inventory/dto/inventory.request.dto";
import { InventoryViewDto } from "src/adapters/http/inventory/dto/inventory.view.dto";
import { InventoryOrchestrator } from "src/adapters/http/inventory/inventory.orchestrator";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";


describe("InventoryOrchestrator", () => {
    let orchestrator: InventoryOrchestrator;
    let inventoryService: InventoryService;

    const mockInventoryService = {
        findAllCardsForUser: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    const mockAuthenticatedRequest = {
        user: {
            id: 1,
            name: "Test User",
            email: "test@example.com",
        },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockInventoryRequest: InventoryRequestDto[] = [
        {
            cardId: "card1",
            quantity: 3,
            isFoil: false,
            userId: 1,
        },
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryOrchestrator,
                {
                    provide: InventoryService,
                    useValue: mockInventoryService,
                },
            ],
        }).compile();

        module.useLogger(new Logger());
        orchestrator = module.get<InventoryOrchestrator>(InventoryOrchestrator);
        inventoryService = module.get<InventoryService>(InventoryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("findByUser", () => {
        it("should return empty inventory view when user has no items", async () => {
            mockInventoryService.findAllCardsForUser.mockResolvedValue([]);

            const result: InventoryViewDto = await orchestrator.findByUser(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.cards).toHaveLength(0);
            expect(result.status).toBe(ActionStatus.SUCCESS);
        });
    });

    describe("save", () => {
        it("should save inventory items and return them", async () => {
            const mockInventoryItems: Inventory[] = [
                {
                    userId: 1,
                    cardId: "card1",
                    quantity: 2,
                    isFoil: false,
                },
                {
                    userId: 1,
                    cardId: "card1",
                    quantity: 1,
                    isFoil: true,
                }
            ];
            mockInventoryService.save.mockResolvedValue(mockInventoryItems);

            const result = await orchestrator.save(mockInventoryRequest, mockAuthenticatedRequest);

            expect(result).toEqual(mockInventoryItems);
            expect(inventoryService.save).toHaveBeenCalledTimes(1);
        });

        it("should throw error if request is not authenticated", async () => {
            const unauthenticatedRequest = { user: null } as AuthenticatedRequest;

            await expect(
                orchestrator.save(mockInventoryRequest, unauthenticatedRequest)
            ).rejects.toThrow();
        });
    });

    describe("delete", () => {
        it("should delete inventory item and return true", async () => {
            mockInventoryService.delete.mockResolvedValue(true);

            const result = await orchestrator.delete(mockAuthenticatedRequest, "card1", false);

            expect(result).toBe(true);
            expect(inventoryService.delete).toHaveBeenCalledWith(
                mockAuthenticatedRequest.user.id,
                "card1",
                false
            );
        });

        it("should throw BadRequestException if cardId is missing", async () => {
            await expect(
                orchestrator.delete(mockAuthenticatedRequest, null, false)
            ).rejects.toThrow(BadRequestException);
            expect(inventoryService.delete).not.toHaveBeenCalled();
        });

        it("should throw error if request is not authenticated", async () => {
            const unauthenticatedRequest = { user: null } as AuthenticatedRequest;

            await expect(
                orchestrator.delete(unauthenticatedRequest, "card1", false)
            ).rejects.toThrow();
        });
    });
});