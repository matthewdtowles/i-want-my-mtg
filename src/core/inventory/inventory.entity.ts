import { Card } from "src/core/card/card.entity";
import { User } from "src/core/user/user.entity";

export class Inventory {
    cardId: string;
    userId: number;
    isFoil: boolean;
    quantity: number;
    card: Card;
    user: User;
}
