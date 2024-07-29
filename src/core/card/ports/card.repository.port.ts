import { Card } from "../card.entity";

export interface CardRepositoryPort {
    findCardById(id: string): Promise<Card | null>;
    saveCard(card: Card): Promise<Card>;
}