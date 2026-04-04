import { Test, TestingModule } from '@nestjs/testing';
import { PriceNotification } from 'src/core/price-alert/price-notification.entity';
import { PriceNotificationRepositoryPort } from 'src/core/price-alert/ports/price-notification.repository.port';
import { PriceNotificationService } from 'src/core/price-alert/price-notification.service';

describe('PriceNotificationService', () => {
    let service: PriceNotificationService;
    let repo: jest.Mocked<PriceNotificationRepositoryPort>;

    const mockRepo = {
        createMany: jest.fn(),
        findByUser: jest.fn(),
        countByUser: jest.fn(),
        countUnreadByUser: jest.fn(),
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PriceNotificationService,
                { provide: PriceNotificationRepositoryPort, useValue: mockRepo },
            ],
        }).compile();

        service = module.get<PriceNotificationService>(PriceNotificationService);
        repo = module.get(
            PriceNotificationRepositoryPort
        ) as jest.Mocked<PriceNotificationRepositoryPort>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findByUser', () => {
        it('should return paginated notifications', async () => {
            const notifications = [
                new PriceNotification({
                    id: 1,
                    userId: 1,
                    cardId: 'card-1',
                    direction: 'increase',
                    oldPrice: 5.0,
                    newPrice: 6.0,
                    changePct: 20.0,
                }),
            ];
            repo.findByUser.mockResolvedValue(notifications);

            const result = await service.findByUser(1, 1, 10);

            expect(repo.findByUser).toHaveBeenCalledWith(1, 1, 10);
            expect(result).toEqual(notifications);
        });
    });

    describe('countByUser', () => {
        it('should return total count', async () => {
            repo.countByUser.mockResolvedValue(5);
            const result = await service.countByUser(1);
            expect(result).toBe(5);
        });
    });

    describe('countUnreadByUser', () => {
        it('should return unread count', async () => {
            repo.countUnreadByUser.mockResolvedValue(3);
            const result = await service.countUnreadByUser(1);
            expect(result).toBe(3);
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            await service.markAsRead(1, 1);
            expect(repo.markAsRead).toHaveBeenCalledWith(1, 1);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read for user', async () => {
            await service.markAllAsRead(1);
            expect(repo.markAllAsRead).toHaveBeenCalledWith(1);
        });
    });
});
