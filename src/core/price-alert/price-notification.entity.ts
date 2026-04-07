import { validateInit } from 'src/core/validation.util';

export type PriceChangeDirection = 'increase' | 'decrease';

export class PriceNotification {
    readonly id?: number;
    readonly userId: number;
    readonly cardId: string;
    readonly alertId: number | null;
    readonly direction: PriceChangeDirection;
    readonly oldPrice: number;
    readonly newPrice: number;
    readonly changePct: number;
    readonly isRead: boolean;
    readonly createdAt: Date;
    // For read operations only
    readonly cardName?: string;
    readonly cardNumber?: string;
    readonly setCode?: string;

    constructor(init: Partial<PriceNotification>) {
        validateInit(init, ['userId', 'cardId', 'direction', 'oldPrice', 'newPrice', 'changePct']);
        this.id = init.id;
        this.userId = init.userId;
        this.cardId = init.cardId;
        this.alertId = init.alertId ?? null;
        this.direction = init.direction;
        this.oldPrice = init.oldPrice;
        this.newPrice = init.newPrice;
        this.changePct = init.changePct;
        this.isRead = init.isRead ?? false;
        this.createdAt = init.createdAt ?? new Date();
        this.cardName = init.cardName;
        this.cardNumber = init.cardNumber;
        this.setCode = init.setCode;
    }
}
