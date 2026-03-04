export class TransactionResponseDto {
    readonly id: number;
    readonly cardId: string;
    readonly cardName: string;
    readonly cardSetCode: string;
    readonly cardUrl: string;
    readonly type: string;
    readonly quantity: number;
    readonly pricePerUnit: string;
    readonly totalPrice: string;
    readonly isFoil: boolean;
    readonly date: string;
    readonly source: string;
    readonly fees: string;
    readonly notes: string;

    constructor(init: Partial<TransactionResponseDto>) {
        this.id = init.id || 0;
        this.cardId = init.cardId || '';
        this.cardName = init.cardName || '';
        this.cardSetCode = init.cardSetCode || '';
        this.cardUrl = init.cardUrl || '';
        this.type = init.type || '';
        this.quantity = init.quantity || 0;
        this.pricePerUnit = init.pricePerUnit || '';
        this.totalPrice = init.totalPrice || '';
        this.isFoil = init.isFoil || false;
        this.date = init.date || '';
        this.source = init.source || '';
        this.fees = init.fees || '';
        this.notes = init.notes || '';
    }
}
