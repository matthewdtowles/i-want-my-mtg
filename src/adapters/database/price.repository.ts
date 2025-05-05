import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { Price } from "src/core/price/price.entity";
import { Repository } from "typeorm";

@Injectable()
export class PriceRepository implements PriceRepositoryPort {

    constructor(@InjectRepository(Price) private readonly priceRepository: Repository<Price>) { }

    async save(price: Price): Promise<Price> {
        return this.priceRepository.save(price);
    }

    async saveMany(prices: Price[]): Promise<Price[]> {
        return await this.priceRepository.save(prices);
    }

    async findByCardId(cardId: number): Promise<Price> {
        return await this.priceRepository.findOne({
            where: { cardId }
        });
    }

    async delete(id: number): Promise<void> {
        await this.priceRepository.delete(id);
    }
}