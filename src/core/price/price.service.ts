import { Inject } from "@nestjs/common";
import { Card, CardRepositoryPort } from "src/core/card";
import { CreatePriceDto, Price, PriceRepositoryPort } from "src/core/price";

export class PriceService {

    constructor(
        @Inject(PriceRepositoryPort) private readonly priceRepository: PriceRepositoryPort,
        @Inject(CardRepositoryPort) private readonly cardRepository: CardRepositoryPort,
    ) { }

    async save(priceDtos: CreatePriceDto[]): Promise<void> {
        if (0 === priceDtos.length) return;
        const uuids: string[] = [...new Set(priceDtos.map((p) => p.cardUuid))];
        const cards: Card[] = await this.cardRepository.findByUuids(uuids);
        const cardMap: Map<string, number> = new Map(cards.map((c) => [c.id, c.order]));
        const priceEntities: Price[] = await Promise.all(
            priceDtos.map((p) => {
                const cardId: number = cardMap.get(p.cardUuid);
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