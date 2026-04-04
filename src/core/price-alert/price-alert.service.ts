import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { EmailService } from 'src/core/email/email.service';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';
import { PriceAlert } from './price-alert.entity';
import { PriceNotification, PriceChangeDirection } from './price-notification.entity';
import { AlertWithPriceData, PriceAlertRepositoryPort } from './ports/price-alert.repository.port';
import { PriceNotificationRepositoryPort } from './ports/price-notification.repository.port';

export interface ProcessAlertsResult {
    notificationsSent: number;
    usersNotified: number;
}

interface TriggeredAlert {
    alertId: number;
    userId: number;
    cardId: string;
    cardName: string;
    setCode: string;
    direction: PriceChangeDirection;
    oldPrice: number;
    newPrice: number;
    changePct: number;
}

@Injectable()
export class PriceAlertService {
    private readonly LOGGER = getLogger(PriceAlertService.name);

    constructor(
        @Inject(PriceAlertRepositoryPort) private readonly alertRepo: PriceAlertRepositoryPort,
        @Inject(PriceNotificationRepositoryPort)
        private readonly notificationRepo: PriceNotificationRepositoryPort,
        @Inject(EmailService) private readonly emailService: EmailService,
        @Inject(UserRepositoryPort) private readonly userRepo: UserRepositoryPort
    ) {}

    async create(alert: PriceAlert): Promise<PriceAlert> {
        if (alert.increasePct == null && alert.decreasePct == null) {
            throw new Error('At least one threshold (increasePct or decreasePct) is required');
        }
        const existing = await this.alertRepo.findByUserAndCard(alert.userId, alert.cardId);
        if (existing) {
            throw new Error('Price alert already exists for this card');
        }
        return this.alertRepo.create(alert);
    }

    async findByUser(userId: number, page: number, limit: number): Promise<PriceAlert[]> {
        return this.alertRepo.findByUser(userId, page, limit);
    }

    async countByUser(userId: number): Promise<number> {
        return this.alertRepo.countByUser(userId);
    }

    async update(
        alertId: number,
        userId: number,
        updates: { increasePct?: number | null; decreasePct?: number | null; isActive?: boolean }
    ): Promise<PriceAlert> {
        const existing = await this.alertRepo.findById(alertId);
        if (!existing) {
            throw new Error('Price alert not found');
        }
        if (existing.userId !== userId) {
            throw new Error('Not authorized to update this alert');
        }
        const updated = new PriceAlert({
            ...existing,
            increasePct:
                updates.increasePct !== undefined ? updates.increasePct : existing.increasePct,
            decreasePct:
                updates.decreasePct !== undefined ? updates.decreasePct : existing.decreasePct,
            isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
        });
        return this.alertRepo.update(updated);
    }

    async delete(alertId: number, userId: number): Promise<void> {
        const existing = await this.alertRepo.findById(alertId);
        if (!existing) {
            throw new Error('Price alert not found');
        }
        if (existing.userId !== userId) {
            throw new Error('Not authorized to delete this alert');
        }
        await this.alertRepo.delete(alertId);
    }

    async processAlerts(): Promise<ProcessAlertsResult> {
        this.LOGGER.log('Processing price alerts...');
        const alertsWithPrices = await this.alertRepo.findActiveWithPriceData();

        if (alertsWithPrices.length === 0) {
            this.LOGGER.log('No active alerts found.');
            return { notificationsSent: 0, usersNotified: 0 };
        }

        const triggered = this.evaluateAlerts(alertsWithPrices);

        if (triggered.length === 0) {
            this.LOGGER.log('No alerts triggered.');
            return { notificationsSent: 0, usersNotified: 0 };
        }

        const byUser = this.groupByUser(triggered);
        let totalNotifications = 0;

        for (const [userId, userAlerts] of byUser.entries()) {
            const notifications = userAlerts.map(
                (t) =>
                    new PriceNotification({
                        userId: t.userId,
                        cardId: t.cardId,
                        alertId: t.alertId,
                        direction: t.direction,
                        oldPrice: t.oldPrice,
                        newPrice: t.newPrice,
                        changePct: t.changePct,
                    })
            );

            await this.notificationRepo.createMany(notifications);
            totalNotifications += notifications.length;

            const alertIds = userAlerts.map((t) => t.alertId);
            await this.alertRepo.updateLastNotifiedAt(alertIds, new Date());

            const user = await this.userRepo.findById(userId);
            if (user?.email) {
                await this.emailService.sendPriceAlertEmail(user.email, user.name, userAlerts);
            }
        }

        this.LOGGER.log(`Processed ${triggered.length} notifications for ${byUser.size} users.`);
        return { notificationsSent: totalNotifications, usersNotified: byUser.size };
    }

    private evaluateAlerts(alertsWithPrices: AlertWithPriceData[]): TriggeredAlert[] {
        const triggered: TriggeredAlert[] = [];

        for (const { alert, cardName, setCode, currentPrice, previousPrice } of alertsWithPrices) {
            if (currentPrice == null || previousPrice == null || previousPrice === 0) {
                continue;
            }

            const changePct = ((currentPrice - previousPrice) / previousPrice) * 100;

            if (alert.increasePct != null && changePct >= alert.increasePct) {
                triggered.push({
                    alertId: alert.id,
                    userId: alert.userId,
                    cardId: alert.cardId,
                    cardName,
                    setCode,
                    direction: 'increase',
                    oldPrice: previousPrice,
                    newPrice: currentPrice,
                    changePct: Math.round(changePct * 100) / 100,
                });
            }

            if (
                alert.decreasePct != null &&
                Math.abs(changePct) >= alert.decreasePct &&
                changePct < 0
            ) {
                triggered.push({
                    alertId: alert.id,
                    userId: alert.userId,
                    cardId: alert.cardId,
                    cardName,
                    setCode,
                    direction: 'decrease',
                    oldPrice: previousPrice,
                    newPrice: currentPrice,
                    changePct: Math.round(changePct * 100) / 100,
                });
            }
        }

        return triggered;
    }

    private groupByUser(triggered: TriggeredAlert[]): Map<number, TriggeredAlert[]> {
        const map = new Map<number, TriggeredAlert[]>();
        for (const t of triggered) {
            const existing = map.get(t.userId) || [];
            existing.push(t);
            map.set(t.userId, existing);
        }
        return map;
    }
}
