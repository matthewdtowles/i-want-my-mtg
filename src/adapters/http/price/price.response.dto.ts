export class PriceResponseDto {
    readonly foil: string;
    readonly normal: string;

    constructor(init: Partial<PriceResponseDto>) {
        this.foil = init.foil || "";
        this.normal = init.normal || "";
    }
}