import { Card, Format, LegalityStatus } from "src/core/card";

export class Legality {
    cardId: string;
    format: Format;
    status: LegalityStatus;
    card?: Card;
}