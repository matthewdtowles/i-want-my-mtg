import { Inject } from "@nestjs/common";
import { Card, CardRepositoryPort } from "src/core/card";
import { Price, PriceRepositoryPort } from "src/core/price";

export class PriceService {

    constructor(
        @Inject(PriceRepositoryPort) private readonly priceRepository: PriceRepositoryPort,
        @Inject(CardRepositoryPort) private readonly cardRepository: CardRepositoryPort,
    ) { }

    async save(prices: Price[]): Promise<void> {
        if (0 === prices.length) return;
        const uuids: string[] = [...new Set(prices.map((p) => p.card.id))];
        const cards: Card[] = await this.cardRepository.findByUuids(uuids);
        const cardMap: Map<string, number> = new Map(cards.map((c) => [c.id, c.order]));
        const priceEntities: Price[] = await Promise.all(
            prices.map((p) => {
                const cardId: number = cardMap.get(p.card.id);
                if (!cardId) return null;
                const card = new Card();
                card.order = cardId;
                return {
                    card,
                    foil: !isNaN(p.foil) ? p.foil : null,
                    normal: !isNaN(p.normal) ? p.normal : null,
                    date: p.date,
                }
            }).filter((p): p is Price => p !== null));
        await this.priceRepository.save(priceEntities)
    }

    async delete(id: number): Promise<void> {
        return await this.priceRepository.delete(id);
    }
}