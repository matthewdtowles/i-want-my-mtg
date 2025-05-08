import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { Price } from "src/core/price/price.entity";
import { Repository } from "typeorm";

@Injectable()
export class PriceRepository implements PriceRepositoryPort {

    constructor(@InjectRepository(Price) private readonly priceRepository: Repository<Price>) { }

    async save(prices: Price[]): Promise<Price[]> {
        return await this.priceRepository.save(prices);
    }

    async findByCardId(cardId: number): Promise<Price> {
        return await this.priceRepository.findOne({
            where: { card: { id: cardId } }
        });
    }

    // TODO: probably need to FIX this
    async findAllIds(): Promise<number[]> {
        return await this.priceRepository
            .createQueryBuilder("price")
            .select("price.card_id", "cardId")
            .getRawMany()
            .then((row) => row.map((r) => r.cardId));
    }

    async delete(id: number): Promise<void> {
        await this.priceRepository.delete(id);
    }
}