import { PriceAlert } from 'src/core/price-alert/price-alert.entity';
import { PriceNotification } from 'src/core/price-alert/price-notification.entity';
import { AlertWithCardData } from 'src/core/price-alert/ports/price-alert.repository.port';
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

    static toAlertWithCardDto(data: AlertWithCardData): PriceAlertApiDto {
        return {
            id: data.alert.id,
            cardId: data.alert.cardId,
            cardName: data.cardName,
            cardNumber: data.cardNumber,
            setCode: data.setCode,
            increasePct: data.alert.increasePct,
            decreasePct: data.alert.decreasePct,
            isActive: data.alert.isActive,
            lastNotifiedAt: data.alert.lastNotifiedAt,
            createdAt: data.alert.createdAt,
            updatedAt: data.alert.updatedAt,
        };
    }

    static toNotificationDto(notification: PriceNotification): PriceNotificationApiDto {
        return {
            id: notification.id,
            cardId: notification.cardId,
            cardName: notification.cardName,
            cardNumber: notification.cardNumber,
            setCode: notification.setCode,
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
