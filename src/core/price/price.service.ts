import { Inject } from "@nestjs/common";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { PriceDto } from "src/core/price/api/price.dto";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceServicePort } from "src/core/price/api/price.service.port";
import { Price } from "src/core/price/price.entity";
import { PriceMapper } from "src/core/price/price.mapper";

export class PriceService implements PriceServicePort {

    constructor(
        @Inject(PriceRepositoryPort) private readonly priceRepository: PriceRepositoryPort,
        @Inject(CardRepositoryPort) private readonly cardRepository: CardRepositoryPort,
        @Inject(PriceMapper) private readonly mapper: PriceMapper,
    ) { }

    async save(priceDtos: CreatePriceDto[]): Promise<void> {
        if (0 === priceDtos.length) return;
        const uuids: string[] = [...new Set(priceDtos.map((p) => p.cardUuid))];
        const cards: Card[] = await this.cardRepository.findByUuids(uuids);
        const cardMap: Map<string, number> = new Map(cards.map((c) => [c.uuid, c.id]));
        const priceEntities: Price[] = await Promise.all(
            priceDtos.map((p) => {
                const cardId: number = cardMap.get(p.cardUuid);
                if (!cardId) return null;
                return this.mapper.toEntity(p, cardId);
            }).filter((p): p is Price => p !== null));
        await this.priceRepository.save(priceEntities)
    }

    async findByCardId(cardId: number): Promise<PriceDto> {
        return await this.priceRepository.findByCardId(cardId).then((c) => this.mapper.toDto(c));
    }

    async delete(id: number): Promise<void> {
        return await this.priceRepository.delete(id);
    }
}