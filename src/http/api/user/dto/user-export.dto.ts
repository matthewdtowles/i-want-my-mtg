export interface UserExportDto {
    exportedAt: string;
    user: {
        id: number;
        email: string;
        name: string;
        role: string;
    };
    inventory: Array<{
        cardId: string;
        isFoil: boolean;
        quantity: number;
    }>;
    transactions: Array<{
        id?: number;
        cardId: string;
        type: 'BUY' | 'SELL';
        quantity: number;
        pricePerUnit: number;
        isFoil: boolean;
        date: string;
        source?: string;
        fees?: number;
        notes?: string;
        createdAt?: string;
    }>;
    priceAlerts: Array<{
        id?: number;
        cardId: string;
        increasePct: number | null;
        decreasePct: number | null;
        isActive: boolean;
        lastNotifiedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    priceNotifications: Array<{
        id?: number;
        cardId: string;
        alertId: number | null;
        direction: 'increase' | 'decrease';
        oldPrice: number;
        newPrice: number;
        changePct: number;
        isRead: boolean;
        createdAt: string;
    }>;
    sealedInventory: Array<{
        sealedProductUuid: string;
        quantity: number;
    }>;
}
