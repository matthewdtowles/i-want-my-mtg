import { Card } from '../card.entity';

/**
 * Persistence layer for Card entity
 * Used by Core
 * Implemented by Adapter
 */
export interface CardRepositoryPort {

    findCardById(id: string): Promise<Card | null>;
    
    save(card: Card): Promise<Card>;
}