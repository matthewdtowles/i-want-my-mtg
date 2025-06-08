import { Inject } from "@nestjs/common";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceServicePort } from "src/core/price/api/price.service.port";
import { Price } from "src/core/price/price.entity";

export class PriceService implements PriceServicePort {

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