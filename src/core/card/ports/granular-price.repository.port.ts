import { GranularPrice } from '../granular-price.entity';

export const GranularPriceRepositoryPort = 'GranularPriceRepositoryPort';

export interface GranularPriceRepositoryPort {
    /**
     * Current buylist offers for a card: the most recent row per
     * (provider, finish, condition). Empty until scry (scry#14) populates the
     * store.
     */
    findCurrentBuylistByCardId(cardId: string): Promise<GranularPrice[]>;
}
