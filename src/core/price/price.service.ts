import { Inject } from "@nestjs/common";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Price } from "./price.entity";
import { PriceRepositoryPort } from "./price.repository.port";

export class PriceService {

    constructor(
        @Inject(PriceRepositoryPort) private readonly priceRepository: PriceRepositoryPort,
        @Inject(CardRepositoryPort) private readonly cardRepository: CardRepositoryPort,
    ) { }

    /**
     * Saves given prices
     * @param prices 
     */
    async save(prices: Price[]): Promise<void> {
        if (0 === prices.length) return;
        const cardIds: string[] = [...new Set(prices.map((p) => p.cardId))];
        const existingCardIds: Set<string> = await this.cardRepository.verifyCardsExist(cardIds);
        const priceEntities: Price[] = prices
            .filter((p) => existingCardIds.has(p.cardId))
            .map((p) => (new Price({
                cardId: p.cardId,
                foil: !isNaN(p.foil) ? p.foil : null,
                normal: !isNaN(p.normal) ? p.normal : null,
                date: p.date,
            })));
        await this.priceRepository.save(priceEntities)
    }

    /**
     * Deletes a price by its ID.
     * @param id
     */
    async delete(id: number): Promise<void> {
        return await this.priceRepository.delete(id);
    }
}