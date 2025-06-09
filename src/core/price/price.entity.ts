import { Card } from "src/core/card";

export class Price {
    id: number;
    foil: number | null;
    normal: number | null;
    date: Date;
    card: Card;
}
