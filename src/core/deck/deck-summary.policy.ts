import { Card } from 'src/core/card/card.entity';
import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';
import { DeckCard } from './deck-card.entity';

/**
 * Pure deck rollups (10.4): estimated value and counts, derived from the loaded
 * deck cards. Value uses the same "normal price, fall back to foil" rule as the
 * rest of the app via PriceCalculationPolicy.
 */
export class DeckSummaryPolicy {
    /** A card's current value (normal, falling back to foil). 0 if no price. */
    static cardValue(card?: Card): number {
        const price = card?.prices?.[0];
        if (!price) {
            return 0;
        }
        return PriceCalculationPolicy.calculateCardValue(price.normal, price.foil, false);
    }

    /** Estimated total value of a deck's cards (main + side), quantity-weighted. */
    static estimatedValue(cards: DeckCard[] = []): number {
        return cards.reduce((sum, dc) => sum + dc.quantity * DeckSummaryPolicy.cardValue(dc.card), 0);
    }

    /** Total card count (sum of quantities), optionally limited to one board. */
    static cardCount(cards: DeckCard[] = [], board?: 'main' | 'side'): number {
        return cards
            .filter((dc) =>
                board === 'main' ? !dc.isSideboard : board === 'side' ? dc.isSideboard : true
            )
            .reduce((sum, dc) => sum + dc.quantity, 0);
    }
}
