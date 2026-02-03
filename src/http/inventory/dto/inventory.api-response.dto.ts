export class InventoryItemDto {
    readonly cardId: string;
    readonly isFoil: boolean;
    readonly quantity: number;

    constructor(init: InventoryItemDto) {
        this.cardId = init.cardId;
        this.isFoil = init.isFoil;
        this.quantity = init.quantity;
    }
}

export class InventoryApiResponseDto {
    readonly success: boolean;
    readonly data?: InventoryItemDto[];
    readonly error?: string;

    constructor(init: Partial<InventoryApiResponseDto>) {
        this.success = init.success ?? false;
        this.data = init.data;
        this.error = init.error;
    }
}

export class InventoryDeleteResponseDto {
    readonly success: boolean;
    readonly error?: string;

    constructor(init: Partial<InventoryDeleteResponseDto>) {
        this.success = init.success ?? false;
        this.error = init.error;
    }
}
