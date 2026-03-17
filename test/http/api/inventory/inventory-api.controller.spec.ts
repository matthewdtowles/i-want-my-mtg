import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { InventoryApiController } from 'src/http/api/inventory/inventory-api.controller';
import { ApiRateLimitGuard } from 'src/http/api/shared/api-rate-limit.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';

function makeReq(userId: number): AuthenticatedRequest {
    return { user: { id: userId } } as AuthenticatedRequest;
}

describe('InventoryApiController', () => {
    let controller: InventoryApiController;
    let inventoryService: jest.Mocked<InventoryService>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [InventoryApiController],
            providers: [
                {
                    provide: InventoryService,
                    useValue: {
                        findAllForUser: jest.fn(),
                        totalInventoryItems: jest.fn(),
                        findByCards: jest.fn(),
                        save: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: ApiRateLimitGuard,
                    useValue: { canActivate: jest.fn().mockReturnValue(true) },
                },
            ],
        }).compile();

        controller = module.get(InventoryApiController);
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getQuantities', () => {
        it('should trim whitespace from card IDs', async () => {
            inventoryService.findByCards.mockResolvedValue([]);
            const req = makeReq(1);

            await controller.getQuantities(' id1 , id2 , id3 ', req);

            expect(inventoryService.findByCards).toHaveBeenCalledWith(1, ['id1', 'id2', 'id3']);
        });

        it('should deduplicate card IDs', async () => {
            inventoryService.findByCards.mockResolvedValue([]);
            const req = makeReq(1);

            await controller.getQuantities('id1,id2,id1,id2', req);

            expect(inventoryService.findByCards).toHaveBeenCalledWith(1, ['id1', 'id2']);
        });

        it('should filter out empty IDs', async () => {
            inventoryService.findByCards.mockResolvedValue([]);
            const req = makeReq(1);

            await controller.getQuantities('id1,,, ,id2', req);

            expect(inventoryService.findByCards).toHaveBeenCalledWith(1, ['id1', 'id2']);
        });

        it('should return empty result for empty input', async () => {
            const req = makeReq(1);

            const result = await controller.getQuantities('', req);

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(inventoryService.findByCards).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException when exceeding 200 IDs', async () => {
            const req = makeReq(1);
            const ids = Array.from({ length: 201 }, (_, i) => `id${i}`).join(',');

            await expect(controller.getQuantities(ids, req)).rejects.toThrow(BadRequestException);
        });

        it('should allow exactly 200 IDs', async () => {
            inventoryService.findByCards.mockResolvedValue([]);
            const req = makeReq(1);
            const ids = Array.from({ length: 200 }, (_, i) => `id${i}`).join(',');

            const result = await controller.getQuantities(ids, req);

            expect(result.success).toBe(true);
            expect(inventoryService.findByCards).toHaveBeenCalled();
        });
    });
});
