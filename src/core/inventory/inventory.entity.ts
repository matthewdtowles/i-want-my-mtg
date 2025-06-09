import { Card } from "src/core/card";
import { User } from "src/core/user";

export class Inventory {
    cardId: string;
    userId: number;
    isFoil: boolean;
    quantity: number;
    card: Card;
    user: User;
}
