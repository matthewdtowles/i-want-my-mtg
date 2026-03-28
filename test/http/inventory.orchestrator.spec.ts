import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { InventoryExportService } from 'src/core/inventory/export/inventory-export.service';
import { InventoryImportService } from 'src/core/inventory/import/inventory-import.service';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Set } from 'src/core/set/set.entity';
import { SetService } from 'src/core/set/set.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { InventoryBinderViewDto } from 'src/http/hbs/inventory/dto/inventory-binder.view.dto';
import { InventoryViewDto } from 'src/http/hbs/inventory/dto/inventory.view.dto';
import { InventoryOrchestrator } from 'src/http/hbs/inventory/inventory.orchestrator';

describe('InventoryOrchestrator', () => {
    let orchestrator: InventoryOrchestrator;
    let inventoryService: jest.Mocked<InventoryService>;
    let transactionService: jest.Mocked<TransactionService>;
    let setService: jest.Mocked<SetService>;

    const mockAuthenticatedRequest = {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockQueryOptions = new SafeQueryOptions({ page: '1', limit: '10', filter: 'test' });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryOrchestrator,
                {
                    provide: InventoryService,
                    useValue: {
                        findAllForUser: jest.fn(),
                        totalInventoryItems: jest.fn(),
                        totalValue: jest.fn(),
                        totalValueForUser: jest.fn(),
                        completionRateAll: jest.fn(),
                        save: jest.fn(),
                        delete: jest.fn(),
                        totalCards: jest.fn(),
                        totalOwnedValue: jest.fn(),
                        totalInventoryItemsForSet: jest.fn(),
                        ownedValueForSet: jest.fn(),
                    },
                },
                {
                    provide: InventoryImportService,
                    useValue: { importCards: jest.fn(), importSet: jest.fn() },
                },
                {
                    provide: InventoryExportService,
                    useValue: { exportToCsv: jest.fn() },
                },
                {
                    provide: TransactionService,
                    useValue: {
                        getRemainingQuantity: jest.fn().mockResolvedValue(0),
                    },
                },
                {
                    provide: SetService,
                    useValue: {
                        findByCode: jest.fn(),
                    },
                },
            ],
        }).compile();

        orchestrator = module.get(InventoryOrchestrator);
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
        transactionService = module.get(TransactionService) as jest.Mocked<TransactionService>;
        setService = module.get(SetService) as jest.Mocked<SetService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        transactionService.getRemainingQuantity.mockResolvedValue(0);
    });

    describe('findByUser', () => {
        it('returns inventory view with items and pagination', async () => {
            const mockCard: Card = {
                id: 'card1',
                name: 'Test Card',
                setCode: 'TST',
                number: '1',
                hasFoil: true,
                hasNonFoil: true,
                imgSrc: 'https://example.com/card1.png',
                isReserved: false,
                rarity: CardRarity.Common,
                manaCost: '{1}{G}',
                oracleText: 'Test oracle text',
                type: 'Test',
                legalities: [],
                prices: [],
                isAlternative: false,
                sortNumber: '000001',
                inMain: true,
            };
            inventoryService.findAllForUser.mockResolvedValue([
                {
                    userId: 1,
                    cardId: 'card1',
                    quantity: 2,
                    isFoil: false,
                    card: mockCard,
                } as Inventory,
            ]);
            inventoryService.totalInventoryItems.mockResolvedValue(1);

            const result: InventoryViewDto = await orchestrator.findByUser(
                mockAuthenticatedRequest,
                mockQueryOptions
            );

            expect(result.cards.length).toBe(1);
            expect(result.pagination.current).toBe(1);
            expect(result.pagination.totalPages).toBe(1);
            expect(result.toast).toBeUndefined();
            expect(result.hasInventory).toBe(true);
        });

        it('returns empty inventory view when user has no items', async () => {
            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalInventoryItems.mockResolvedValue(0);

            const result: InventoryViewDto = await orchestrator.findByUser(
                mockAuthenticatedRequest,
                mockQueryOptions
            );

            expect(result.cards).toHaveLength(0);
            expect(result.pagination.totalPages).toBe(0);
            expect(result.toast).toBeUndefined();
            expect(result.hasInventory).toBe(false);
        });

        it('sets hasInventory true when filters yield no results but user has inventory', async () => {
            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(0) // currentCount (filtered)
                .mockResolvedValueOnce(0) // targetCount
                .mockResolvedValueOnce(10); // unfilteredCount
            inventoryService.totalCards.mockResolvedValue(100);
            inventoryService.totalOwnedValue.mockResolvedValue(50);

            const filteredOptions = new SafeQueryOptions({
                page: '1',
                limit: '10',
                filter: 'nonexistent',
            });
            const result: InventoryViewDto = await orchestrator.findByUser(
                mockAuthenticatedRequest,
                filteredOptions
            );

            expect(result.cards).toHaveLength(0);
            expect(result.hasInventory).toBe(true);
        });

        it('throws error if not authenticated', async () => {
            const unauthenticatedRequest = {
                user: null,
                isAuthenticated: () => false,
            } as AuthenticatedRequest;

            await expect(
                orchestrator.findByUser(unauthenticatedRequest, mockQueryOptions)
            ).rejects.toThrow();
        });
    });

    describe('save', () => {
        it('saves inventory items and returns them', async () => {
            const mockInventoryItems: Inventory[] = [
                { userId: 1, cardId: 'card1', quantity: 2, isFoil: false } as Inventory,
            ];
            inventoryService.save.mockResolvedValue(mockInventoryItems);

            const result = await orchestrator.save(
                [{ cardId: 'card1', quantity: 2, isFoil: false, userId: 1 }],
                mockAuthenticatedRequest
            );

            expect(result).toEqual(mockInventoryItems);
            expect(inventoryService.save).toHaveBeenCalledTimes(1);
        });

        it('throws error if request is not authenticated', async () => {
            const unauthenticatedRequest = {
                user: null,
                isAuthenticated: () => false,
            } as AuthenticatedRequest;

            await expect(
                orchestrator.save(
                    [{ cardId: 'card1', quantity: 2, isFoil: false, userId: 1 }],
                    unauthenticatedRequest
                )
            ).rejects.toThrow();
        });

        it('returns error DTO on service failure', async () => {
            inventoryService.save.mockRejectedValue(new Error('DB error'));

            await expect(
                orchestrator.save(
                    [{ cardId: 'card1', quantity: 2, isFoil: false, userId: 1 }],
                    mockAuthenticatedRequest
                )
            ).rejects.toThrow('An unexpected error occurred');
        });
    });

    describe('delete', () => {
        it('deletes inventory item and returns true', async () => {
            inventoryService.delete.mockResolvedValue(true);

            const result = await orchestrator.delete(mockAuthenticatedRequest, 'card1', false);

            expect(result).toBe(true);
            expect(inventoryService.delete).toHaveBeenCalledWith(
                mockAuthenticatedRequest.user.id,
                'card1',
                false
            );
        });

        it('throws BadRequestException if cardId is missing', async () => {
            await expect(
                orchestrator.delete(mockAuthenticatedRequest, null, false)
            ).rejects.toThrow(BadRequestException);
            expect(inventoryService.delete).not.toHaveBeenCalled();
        });

        it('throws error if request is not authenticated', async () => {
            const unauthenticatedRequest = {
                user: null,
                isAuthenticated: () => false,
            } as AuthenticatedRequest;

            await expect(
                orchestrator.delete(unauthenticatedRequest, 'card1', false)
            ).rejects.toThrow();
        });

        it('returns error DTO on service failure', async () => {
            inventoryService.delete.mockRejectedValue(new Error('DB error'));

            await expect(
                orchestrator.delete(mockAuthenticatedRequest, 'card1', false)
            ).rejects.toThrow('An unexpected error occurred');
        });
    });

    describe('transaction-derived quantity validation', () => {
        it('should prevent setting inventory below transaction-derived quantity', async () => {
            transactionService.getRemainingQuantity.mockResolvedValue(7);

            await expect(
                orchestrator.save(
                    [{ cardId: 'card-1', quantity: 5, isFoil: false, userId: 1 }],
                    mockAuthenticatedRequest
                )
            ).rejects.toThrow(BadRequestException);
        });

        it('should allow setting inventory at or above transaction-derived quantity', async () => {
            transactionService.getRemainingQuantity.mockResolvedValue(7);
            const validItem = {
                userId: 1,
                cardId: 'card-1',
                isFoil: false,
                quantity: 7,
            } as Inventory;
            inventoryService.save.mockResolvedValue([validItem]);

            const result = await orchestrator.save(
                [{ cardId: 'card-1', quantity: 7, isFoil: false, userId: 1 }],
                mockAuthenticatedRequest
            );
            expect(result).toEqual([validItem]);
        });

        it('should prevent removing inventory when transactions exist', async () => {
            transactionService.getRemainingQuantity.mockResolvedValue(5);

            await expect(
                orchestrator.save(
                    [{ cardId: 'card-1', quantity: 0, isFoil: false, userId: 1 }],
                    mockAuthenticatedRequest
                )
            ).rejects.toThrow(BadRequestException);
        });

        it('should allow any quantity when no transactions exist', async () => {
            transactionService.getRemainingQuantity.mockResolvedValue(0);
            const item = { userId: 1, cardId: 'card-1', isFoil: false, quantity: 1 } as Inventory;
            inventoryService.save.mockResolvedValue([item]);

            const result = await orchestrator.save(
                [{ cardId: 'card-1', quantity: 1, isFoil: false, userId: 1 }],
                mockAuthenticatedRequest
            );
            expect(result).toEqual([item]);
        });

        it('should prevent deleting inventory when transactions exist', async () => {
            transactionService.getRemainingQuantity.mockResolvedValue(5);

            await expect(
                orchestrator.delete(mockAuthenticatedRequest, 'card-1', false)
            ).rejects.toThrow(BadRequestException);
            expect(inventoryService.delete).not.toHaveBeenCalled();
        });

        it('should allow deleting inventory when no transactions exist', async () => {
            transactionService.getRemainingQuantity.mockResolvedValue(0);
            inventoryService.delete.mockResolvedValue(true);

            const result = await orchestrator.delete(mockAuthenticatedRequest, 'card-1', false);

            expect(result).toBe(true);
            expect(inventoryService.delete).toHaveBeenCalled();
        });
    });

    describe('baseOnlyToggle visibility and page clamping', () => {
        const mockCard: Card = {
            id: 'card1',
            name: 'Test Card',
            setCode: 'TST',
            number: '1',
            hasFoil: true,
            hasNonFoil: true,
            imgSrc: 'https://example.com/card1.png',
            isReserved: false,
            rarity: CardRarity.Common,
            manaCost: '{1}{G}',
            oracleText: 'Test oracle text',
            type: 'Test',
            legalities: [],
            prices: [],
            isAlternative: false,
            sortNumber: '000001',
            inMain: true,
        };

        beforeEach(() => {
            inventoryService.findAllForUser.mockResolvedValue([
                {
                    userId: 1,
                    cardId: 'card1',
                    quantity: 2,
                    isFoil: false,
                    card: mockCard,
                } as Inventory,
            ]);
            inventoryService.totalCards.mockResolvedValue(100);
            inventoryService.totalOwnedValue.mockResolvedValue(50);
        });

        it('hides toggle when currentCount equals targetCount', async () => {
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(25) // currentCount
                .mockResolvedValueOnce(25); // targetCount (same)

            const options = new SafeQueryOptions({ page: '1', limit: '10', baseOnly: 'true' });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.visible).toBe(false);
        });

        it('hides toggle when targetCount is zero', async () => {
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(25) // currentCount
                .mockResolvedValueOnce(0); // targetCount is 0

            const options = new SafeQueryOptions({ page: '1', limit: '10', baseOnly: 'true' });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.visible).toBe(false);
        });

        it('shows toggle when currentCount differs from targetCount and targetCount > 0', async () => {
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(50) // currentCount (baseOnly=true)
                .mockResolvedValueOnce(75); // targetCount (baseOnly=false)

            const options = new SafeQueryOptions({ page: '1', limit: '10', baseOnly: 'true' });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.visible).toBe(true);
            expect(result.baseOnlyToggle.text).toBe('Show All');
        });

        it('shows toggle with correct text when baseOnly is false', async () => {
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(75) // currentCount (baseOnly=false)
                .mockResolvedValueOnce(50); // targetCount (baseOnly=true)

            const options = new SafeQueryOptions({ page: '1', limit: '10', baseOnly: 'false' });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.visible).toBe(true);
            expect(result.baseOnlyToggle.text).toBe('Main Only');
        });

        it('clamps page to targetMaxPage when current page exceeds target pages', async () => {
            // Current: 100 items, page 10 (10 pages at limit 10)
            // Target: 30 items (3 pages at limit 10) - page should clamp to 3
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(100) // currentCount
                .mockResolvedValueOnce(30); // targetCount

            const options = new SafeQueryOptions({ page: '10', limit: '10', baseOnly: 'false' });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.visible).toBe(true);
            // URL should contain page=3 (clamped from 10 to max 3)
            expect(result.baseOnlyToggle.url).toContain('page=3');
        });

        it('does not clamp page when current page is within target pages', async () => {
            // Current: 100 items, page 2
            // Target: 50 items (5 pages at limit 10) - page 2 is fine
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(100) // currentCount
                .mockResolvedValueOnce(50); // targetCount

            const options = new SafeQueryOptions({ page: '2', limit: '10', baseOnly: 'false' });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.visible).toBe(true);
            expect(result.baseOnlyToggle.url).toContain('page=2');
        });

        it('sets targetMaxPage to 1 when targetCount is very small', async () => {
            // Current: 100 items, page 5
            // Target: 5 items (1 page at limit 10) - page should clamp to 1
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(100) // currentCount
                .mockResolvedValueOnce(5); // targetCount

            const options = new SafeQueryOptions({ page: '5', limit: '10', baseOnly: 'false' });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.visible).toBe(true);
            expect(result.baseOnlyToggle.url).toContain('page=1');
        });

        it('preserves filter and sort in toggle URL', async () => {
            inventoryService.totalInventoryItems
                .mockResolvedValueOnce(50)
                .mockResolvedValueOnce(30);

            const options = new SafeQueryOptions({
                page: '1',
                limit: '10',
                baseOnly: 'true',
                filter: 'dragon',
                sort: 'card.name',
            });
            const result = await orchestrator.findByUser(mockAuthenticatedRequest, options);

            expect(result.baseOnlyToggle.url).toContain('filter=dragon');
            expect(result.baseOnlyToggle.url).toContain('sort=card.name');
            expect(result.baseOnlyToggle.url).toContain('baseOnly=false');
        });
    });

    describe('findBinderBySet', () => {
        const mockSet = new Set({
            code: 'MH3',
            name: 'Modern Horizons 3',
            baseSize: 250,
            totalSize: 350,
            isMain: true,
            keyruneCode: 'mh3',
            releaseDate: '2024-06-14',
            type: 'expansion',
        });

        it('should return binder view dto with correct data', async () => {
            setService.findByCode.mockResolvedValue(mockSet);
            inventoryService.totalInventoryItemsForSet.mockResolvedValue(42);
            inventoryService.ownedValueForSet.mockResolvedValue(123.45);

            const result = await orchestrator.findBinderBySet(mockAuthenticatedRequest, 'MH3');

            expect(result).toBeInstanceOf(InventoryBinderViewDto);
            expect(result.setCode).toBe('MH3');
            expect(result.setName).toBe('Modern Horizons 3');
            expect(result.ownedTotal).toBe(42);
            expect(result.cardTotal).toBe(250);
            expect(result.completionRate).toBe(16.8);
            expect(result.ownedValue).toBe('$123.45');
            expect(setService.findByCode).toHaveBeenCalledWith('MH3');
            expect(inventoryService.totalInventoryItemsForSet).toHaveBeenCalledWith(1, 'MH3');
            expect(inventoryService.ownedValueForSet).toHaveBeenCalledWith(1, 'MH3');
        });

        it('should throw NotFoundException when set not found', async () => {
            setService.findByCode.mockResolvedValue(null);

            await expect(
                orchestrator.findBinderBySet(mockAuthenticatedRequest, 'INVALID')
            ).rejects.toThrow('Set not found: INVALID');
        });
    });
});
