import { validateInit } from 'src/core/validation.util';

export class PriceAlert {
    readonly id?: number;
    readonly userId: number;
    readonly cardId: string;
    readonly increasePct: number | null;
    readonly decreasePct: number | null;
    readonly isActive: boolean;
    readonly lastNotifiedAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(init: Partial<PriceAlert>) {
        validateInit(init, ['userId', 'cardId']);
        this.id = init.id;
        this.userId = init.userId;
        this.cardId = init.cardId;
        this.increasePct = init.increasePct ?? null;
        this.decreasePct = init.decreasePct ?? null;
        this.isActive = init.isActive ?? true;
        this.lastNotifiedAt = init.lastNotifiedAt ?? null;
        this.createdAt = init.createdAt ?? new Date();
        this.updatedAt = init.updatedAt ?? new Date();
    }
}
