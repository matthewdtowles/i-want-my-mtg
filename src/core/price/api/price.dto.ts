export class PriceDto {
    cardId: number;
    // TODO: convert both to string for READ ops (i.e.: when this is used)
    foil: string | number | null;
    normal: string | number | null;
    date: Date;
}