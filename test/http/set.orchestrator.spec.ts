import { Test, TestingModule } from "@nestjs/testing";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { SetListViewDto } from "src/adapters/http/set/dto/set-list.view.dto";
import { SetViewDto } from "src/adapters/http/set/dto/set.view.dto";
import { SetOrchestrator } from "src/adapters/http/set/set.orchestrator";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";

describe("SetOrchestrator", () => {
    let orchestrator: SetOrchestrator;
    let setService: SetService;
    let inventoryService: InventoryService;

    const mockSetService = {
        findAll: jest.fn(),
        findByCode: jest.fn(),
    };

    const mockInventoryService = {
        findByCards: jest.fn(),
        getUniqueOwnedCountByUserId: jest.fn(),
    };

    const mockAuthenticatedRequest = {
        user: {
            id: 1,
            name: "Test User",
        },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockCard1 = {
        id: "card1",
        name: "Test Card 1",
        setCode: "TST",
        number: "1",
        setName: "Test Set",
        hasFoil: true,
        hasNonFoil: true,
        imgSrc: "https://example.com/card1.png",
        isReserved: false,
        rarity: CardRarity.Common,
        typeLine: "Creature",
        manaCost: "{1}{G}",
        oracleText: "Test oracle text 1",
        type: "Test",
        legalities: []
    };

    const mockCard2 = {
        id: "card2",
        name: "Test Card 2",
        setCode: "TST",
        number: "2",
        setName: "Test Set",
        hasFoil: false,
        hasNonFoil: true,
        imgSrc: "https://example.com/card2.png",
        isReserved: false,
        rarity: CardRarity.Common,
        typeLine: "Instant",
        manaCost: "{U}",
        oracleText: "Test oracle text 2",
        type: "Test",
        legalities: []
    };

    const mockSets: Set[] = [
        {
            code: "TST",
            baseSize: 2,
            keyruneCode: "TST",
            name: "Test Set",
            releaseDate: String(new Date()),
            cards: [mockCard1, mockCard2],
            type: "test",
        },
        {
            code: "XYZ",
            baseSize: 2,
            keyruneCode: "XYZ",
            name: "Another Set",
            releaseDate: String(new Date()),
            cards: [],
            type: "test",
        },
    ];

    const mockInventoryItems: Inventory[] = [
        {
            id: "inv1",
            userId: 1,
            cardId: "card1",
            quantity: 2,
            isFoil: false,
        } as Inventory,
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SetOrchestrator,
                {
                    provide: SetService,
                    useValue: mockSetService,
                },
                {
                    provide: InventoryService,
                    useValue: mockInventoryService,
                },
            ],
        }).compile();

        orchestrator = module.get<SetOrchestrator>(SetOrchestrator);
        setService = module.get<SetService>(SetService);
        inventoryService = module.get<InventoryService>(InventoryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("findSetList", () => {
        it("should return list of sets", async () => {
            mockSetService.findAll.mockResolvedValue(mockSets);
            mockInventoryService.getUniqueOwnedCountByUserId.mockResolvedValue(1);

            const result: SetListViewDto = await orchestrator.findSetList(mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.setList).toHaveLength(2);
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(setService.findAll).toHaveBeenCalled();
        });

        it("should return error view when no sets found", async () => {
            mockSetService.findAll.mockResolvedValue([]);

            const result: SetListViewDto = await orchestrator.findSetList(mockAuthenticatedRequest);

            expect(result.setList).toHaveLength(0);
            expect(result.status).toBe(ActionStatus.ERROR);
        });

        it("should handle unauthenticated requests", async () => {
            const unauthenticatedReq = {
                user: null,
                isAuthenticated: () => false
            } as AuthenticatedRequest;
            mockSetService.findAll.mockResolvedValue(mockSets);

            const result: SetListViewDto = await orchestrator.findSetList(unauthenticatedReq);

            expect(result.authenticated).toBe(false);
            expect(result.setList).toHaveLength(2);
        });
    });

    describe("findBySetCode", () => {
        it("should return set details", async () => {
            mockSetService.findByCode.mockResolvedValue(mockSets[0]);
            mockInventoryService.findByCards.mockResolvedValue(mockInventoryItems);

            const result: SetViewDto = await orchestrator.findBySetCode("TST", mockAuthenticatedRequest);

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.set).toBeDefined();
            expect(result.set.code).toBe("TST");
            expect(result.status).toBe(ActionStatus.SUCCESS);
            expect(setService.findByCode).toHaveBeenCalledWith("TST");
            expect(inventoryService.findByCards).toHaveBeenCalledWith(
                mockAuthenticatedRequest.user.id,
                expect.arrayContaining(["card1", "card2"])
            );
        });

        it("should throw error when set not found", async () => {
            mockSetService.findByCode.mockResolvedValue(null);

            await expect(orchestrator.findBySetCode("INVALID", mockAuthenticatedRequest)).rejects.toThrow("Set with code INVALID not found");
        });

        it("should handle unauthenticated requests", async () => {
            const unauthenticatedReq = {
                user: null,
                isAuthenticated: () => false
            } as AuthenticatedRequest;
            mockSetService.findByCode.mockResolvedValue(mockSets[0]);

            const result: SetViewDto = await orchestrator.findBySetCode("TST", unauthenticatedReq);

            expect(result.authenticated).toBe(false);
            expect(result.set).toBeDefined();
            expect(inventoryService.findByCards).not.toHaveBeenCalled();
        });
    });
});