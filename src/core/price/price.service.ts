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
        const uuids: string[] = [...new Set(prices.map((p) => p.cardId))];
        const cards: Card[] = await this.cardRepository.findByIds(uuids);
        const cardMap: Map<string, number> = new Map(cards.map((c) => [c.id, c.order]));
        const priceEntities: Price[] = prices
            .filter((p) => cardMap.has(p.cardId))
            .map((p) => ({
                cardId: p.cardId,
                foil: !isNaN(p.foil) ? p.foil : null,
                normal: !isNaN(p.normal) ? p.normal : null,
                date: p.date,
            }));
        await this.priceRepository.save(priceEntities)
    }

    async delete(id: number): Promise<void> {
        return await this.priceRepository.delete(id);
    }
}