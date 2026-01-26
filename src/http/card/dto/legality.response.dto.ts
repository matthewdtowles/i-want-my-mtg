export class LegalityResponseDto {
    readonly cardId: string;
    readonly format: string;
    readonly status: string;

    constructor(init: Partial<LegalityResponseDto>) {
        this.cardId = init.cardId || '';
        this.format = init.format || '';
        this.status = init.status || '';
    }
}
