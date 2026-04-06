import { Test, TestingModule } from '@nestjs/testing';
import { PriceAlert } from 'src/core/price-alert/price-alert.entity';
import {
    AlertWithPriceData,
    PriceAlertRepositoryPort,
} from 'src/core/price-alert/ports/price-alert.repository.port';
import { PriceNotificationRepositoryPort } from 'src/core/price-alert/ports/price-notification.repository.port';
import { PriceAlertService } from 'src/core/price-alert/price-alert.service';
import { EmailService } from 'src/core/email/email.service';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';
import { User } from 'src/core/user/user.entity';
import { UserRole } from 'src/shared/constants/user.role.enum';

describe('PriceAlertService', () => {
    let service: PriceAlertService;
    let alertRepo: jest.Mocked<PriceAlertRepositoryPort>;
    let notificationRepo: jest.Mocked<PriceNotificationRepositoryPort>;
    let emailService: jest.Mocked<EmailService>;
    let userRepo: jest.Mocked<UserRepositoryPort>;

    const mockAlertRepo = {
        create: jest.fn(),
        findById: jest.fn(),
        findByUserAndCard: jest.fn(),
        findByUser: jest.fn(),
        findByUserWithCardData: jest.fn(),
        countByUser: jest.fn(),
        findActiveWithPriceData: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        updateLastNotifiedAt: jest.fn(),
    };

    const mockNotificationRepo = {
        createMany: jest.fn(),
        findByUser: jest.fn(),
        findByUserWithCardData: jest.fn(),
        countByUser: jest.fn(),
        countUnreadByUser: jest.fn(),
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
    };

    const mockEmailService = {
        sendPriceAlertEmail: jest.fn(),
    };

    const mockUserRepo = {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PriceAlertService,
                { provide: PriceAlertRepositoryPort, useValue: mockAlertRepo },
                { provide: PriceNotificationRepositoryPort, useValue: mockNotificationRepo },
                { provide: EmailService, useValue: mockEmailService },
                { provide: UserRepositoryPort, useValue: mockUserRepo },
            ],
        }).compile();

        service = module.get<PriceAlertService>(PriceAlertService);
        alertRepo = module.get(PriceAlertRepositoryPort) as jest.Mocked<PriceAlertRepositoryPort>;
        notificationRepo = module.get(
            PriceNotificationRepositoryPort
        ) as jest.Mocked<PriceNotificationRepositoryPort>;
        emailService = module.get(EmailService) as jest.Mocked<EmailService>;
        userRepo = module.get(UserRepositoryPort) as jest.Mocked<UserRepositoryPort>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a price alert', async () => {
            const alert = new PriceAlert({ userId: 1, cardId: 'card-1', increasePct: 10 });
            alertRepo.findByUserAndCard.mockResolvedValue(null);
            alertRepo.create.mockResolvedValue(new PriceAlert({ ...alert, id: 1 }));

            const result = await service.create(alert);

            expect(alertRepo.findByUserAndCard).toHaveBeenCalledWith(1, 'card-1');
            expect(alertRepo.create).toHaveBeenCalledWith(alert);
            expect(result.id).toBe(1);
        });

        it('should throw if alert already exists for user and card', async () => {
            const existing = new PriceAlert({ id: 1, userId: 1, cardId: 'card-1', increasePct: 5 });
            alertRepo.findByUserAndCard.mockResolvedValue(existing);

            const alert = new PriceAlert({ userId: 1, cardId: 'card-1', increasePct: 10 });
            await expect(service.create(alert)).rejects.toThrow();
        });

        it('should throw if neither increase nor decrease threshold is set', async () => {
            alertRepo.findByUserAndCard.mockResolvedValue(null);
            const alert = new PriceAlert({ userId: 1, cardId: 'card-1' });
            await expect(service.create(alert)).rejects.toThrow();
        });
    });

    describe('findByUser', () => {
        it('should return paginated alerts for user', async () => {
            const alerts = [
                new PriceAlert({ id: 1, userId: 1, cardId: 'card-1', increasePct: 10 }),
            ];
            alertRepo.findByUser.mockResolvedValue(alerts);

            const result = await service.findByUser(1, 1, 10);

            expect(alertRepo.findByUser).toHaveBeenCalledWith(1, 1, 10);
            expect(result).toEqual(alerts);
        });
    });

    describe('update', () => {
        it('should update an existing alert', async () => {
            const existing = new PriceAlert({ id: 1, userId: 1, cardId: 'card-1', increasePct: 5 });
            alertRepo.findById.mockResolvedValue(existing);
            const updated = new PriceAlert({ ...existing, increasePct: 15 });
            alertRepo.update.mockResolvedValue(updated);

            const result = await service.update(1, 1, { increasePct: 15 });

            expect(alertRepo.findById).toHaveBeenCalledWith(1);
            expect(result.increasePct).toBe(15);
        });

        it('should throw if alert not found', async () => {
            alertRepo.findById.mockResolvedValue(null);
            await expect(service.update(999, 1, { increasePct: 15 })).rejects.toThrow();
        });

        it('should throw if alert belongs to different user', async () => {
            const existing = new PriceAlert({ id: 1, userId: 2, cardId: 'card-1', increasePct: 5 });
            alertRepo.findById.mockResolvedValue(existing);
            await expect(service.update(1, 1, { increasePct: 15 })).rejects.toThrow();
        });

        it('should throw if update would null out both thresholds', async () => {
            const existing = new PriceAlert({ id: 1, userId: 1, cardId: 'card-1', increasePct: 10 });
            alertRepo.findById.mockResolvedValue(existing);

            await expect(
                service.update(1, 1, { increasePct: null })
            ).rejects.toThrow('At least one threshold');
        });
    });

    describe('delete', () => {
        it('should delete an alert owned by the user', async () => {
            const existing = new PriceAlert({ id: 1, userId: 1, cardId: 'card-1', increasePct: 5 });
            alertRepo.findById.mockResolvedValue(existing);

            await service.delete(1, 1);

            expect(alertRepo.delete).toHaveBeenCalledWith(1);
        });

        it('should throw if alert belongs to different user', async () => {
            const existing = new PriceAlert({ id: 1, userId: 2, cardId: 'card-1', increasePct: 5 });
            alertRepo.findById.mockResolvedValue(existing);
            await expect(service.delete(1, 1)).rejects.toThrow();
        });
    });

    describe('processAlerts', () => {
        const testUser = new User({
            id: 1,
            email: 'user@test.com',
            name: 'Test User',
            password: 'hashed',
            role: UserRole.User,
        });

        it('should trigger notification when increase threshold is breached', async () => {
            const alertData: AlertWithPriceData[] = [
                {
                    alert: new PriceAlert({
                        id: 1,
                        userId: 1,
                        cardId: 'card-1',
                        increasePct: 10,
                    }),
                    cardName: 'Test Angel',
                    cardNumber: '1',
                    setCode: 'TST',
                    currentPrice: 6.0,
                    previousPrice: 5.0,
                },
            ];
            alertRepo.findActiveWithPriceData.mockResolvedValue(alertData);
            userRepo.findById.mockResolvedValue(testUser);
            mockNotificationRepo.createMany.mockResolvedValue([]);
            mockEmailService.sendPriceAlertEmail.mockResolvedValue(true);

            const result = await service.processAlerts();

            expect(notificationRepo.createMany).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        userId: 1,
                        cardId: 'card-1',
                        direction: 'increase',
                        oldPrice: 5.0,
                        newPrice: 6.0,
                    }),
                ])
            );
            expect(alertRepo.updateLastNotifiedAt).toHaveBeenCalledWith([1], expect.any(Date));
            expect(result.notificationsSent).toBe(1);
        });

        it('should NOT trigger when increase is below threshold', async () => {
            const alertData: AlertWithPriceData[] = [
                {
                    alert: new PriceAlert({
                        id: 2,
                        userId: 1,
                        cardId: 'card-2',
                        increasePct: 10,
                    }),
                    cardName: 'Test Sphinx',
                    cardNumber: '2',
                    setCode: 'TST',
                    currentPrice: 1.6,
                    previousPrice: 1.5,
                },
            ];
            alertRepo.findActiveWithPriceData.mockResolvedValue(alertData);

            const result = await service.processAlerts();

            expect(notificationRepo.createMany).not.toHaveBeenCalled();
            expect(result.notificationsSent).toBe(0);
        });

        it('should trigger notification when decrease threshold is breached', async () => {
            const alertData: AlertWithPriceData[] = [
                {
                    alert: new PriceAlert({
                        id: 3,
                        userId: 1,
                        cardId: 'card-3',
                        decreasePct: 10,
                    }),
                    cardName: 'Test Zombie',
                    cardNumber: '3',
                    setCode: 'TST',
                    currentPrice: 0.2,
                    previousPrice: 0.25,
                },
            ];
            alertRepo.findActiveWithPriceData.mockResolvedValue(alertData);
            userRepo.findById.mockResolvedValue(testUser);
            mockNotificationRepo.createMany.mockResolvedValue([]);
            mockEmailService.sendPriceAlertEmail.mockResolvedValue(true);

            const result = await service.processAlerts();

            expect(notificationRepo.createMany).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        userId: 1,
                        cardId: 'card-3',
                        direction: 'decrease',
                        oldPrice: 0.25,
                        newPrice: 0.2,
                    }),
                ])
            );
            expect(result.notificationsSent).toBe(1);
        });

        it('should NOT trigger when decrease is below threshold', async () => {
            const alertData: AlertWithPriceData[] = [
                {
                    alert: new PriceAlert({
                        id: 4,
                        userId: 1,
                        cardId: 'card-4',
                        decreasePct: 10,
                    }),
                    cardName: 'Test Dragon',
                    cardNumber: '4',
                    setCode: 'TST',
                    currentPrice: 19.0,
                    previousPrice: 20.0,
                },
            ];
            alertRepo.findActiveWithPriceData.mockResolvedValue(alertData);

            const result = await service.processAlerts();

            expect(notificationRepo.createMany).not.toHaveBeenCalled();
            expect(result.notificationsSent).toBe(0);
        });

        it('should skip alerts with null current or previous price', async () => {
            const alertData: AlertWithPriceData[] = [
                {
                    alert: new PriceAlert({
                        id: 5,
                        userId: 1,
                        cardId: 'card-5',
                        increasePct: 10,
                    }),
                    cardName: 'No Price Card',
                    cardNumber: '5',
                    setCode: 'TST',
                    currentPrice: null,
                    previousPrice: 5.0,
                },
            ];
            alertRepo.findActiveWithPriceData.mockResolvedValue(alertData);

            const result = await service.processAlerts();

            expect(notificationRepo.createMany).not.toHaveBeenCalled();
            expect(result.notificationsSent).toBe(0);
        });

        it('should skip alerts where previous price is zero', async () => {
            const alertData: AlertWithPriceData[] = [
                {
                    alert: new PriceAlert({
                        id: 6,
                        userId: 1,
                        cardId: 'card-6',
                        increasePct: 10,
                    }),
                    cardName: 'Zero Price Card',
                    cardNumber: '6',
                    setCode: 'TST',
                    currentPrice: 5.0,
                    previousPrice: 0,
                },
            ];
            alertRepo.findActiveWithPriceData.mockResolvedValue(alertData);

            const result = await service.processAlerts();

            expect(notificationRepo.createMany).not.toHaveBeenCalled();
            expect(result.notificationsSent).toBe(0);
        });

        it('should batch notifications per user and send one email', async () => {
            const alertData: AlertWithPriceData[] = [
                {
                    alert: new PriceAlert({
                        id: 1,
                        userId: 1,
                        cardId: 'card-1',
                        increasePct: 10,
                    }),
                    cardName: 'Test Angel',
                    cardNumber: '1',
                    setCode: 'TST',
                    currentPrice: 6.0,
                    previousPrice: 5.0,
                },
                {
                    alert: new PriceAlert({
                        id: 3,
                        userId: 1,
                        cardId: 'card-3',
                        decreasePct: 10,
                    }),
                    cardName: 'Test Zombie',
                    cardNumber: '3',
                    setCode: 'TST',
                    currentPrice: 0.2,
                    previousPrice: 0.25,
                },
            ];
            alertRepo.findActiveWithPriceData.mockResolvedValue(alertData);
            userRepo.findById.mockResolvedValue(testUser);
            mockNotificationRepo.createMany.mockResolvedValue([]);
            mockEmailService.sendPriceAlertEmail.mockResolvedValue(true);

            const result = await service.processAlerts();

            expect(notificationRepo.createMany).toHaveBeenCalledTimes(1);
            expect(notificationRepo.createMany).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ cardId: 'card-1', direction: 'increase' }),
                    expect.objectContaining({ cardId: 'card-3', direction: 'decrease' }),
                ])
            );
            expect(emailService.sendPriceAlertEmail).toHaveBeenCalledTimes(1);
            expect(result.notificationsSent).toBe(2);
        });

        it('should return zero when no active alerts exist', async () => {
            alertRepo.findActiveWithPriceData.mockResolvedValue([]);

            const result = await service.processAlerts();

            expect(result.notificationsSent).toBe(0);
            expect(notificationRepo.createMany).not.toHaveBeenCalled();
        });
    });
});
