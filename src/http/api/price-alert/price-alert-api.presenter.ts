import { PriceAlert } from 'src/core/price-alert/price-alert.entity';
import { PriceNotification } from 'src/core/price-alert/price-notification.entity';
import { PriceAlertApiDto } from './dto/price-alert-response.dto';
import { PriceNotificationApiDto } from './dto/price-notification-response.dto';

export class PriceAlertApiPresenter {
    static toAlertDto(alert: PriceAlert): PriceAlertApiDto {
        return {
            id: alert.id,
            cardId: alert.cardId,
            increasePct: alert.increasePct,
            decreasePct: alert.decreasePct,
            isActive: alert.isActive,
            lastNotifiedAt: alert.lastNotifiedAt,
            createdAt: alert.createdAt,
            updatedAt: alert.updatedAt,
        };
    }

    static toNotificationDto(notification: PriceNotification): PriceNotificationApiDto {
        return {
            id: notification.id,
            cardId: notification.cardId,
            alertId: notification.alertId,
            direction: notification.direction,
            oldPrice: notification.oldPrice,
            newPrice: notification.newPrice,
            changePct: notification.changePct,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
        };
    }
}
