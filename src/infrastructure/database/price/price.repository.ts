import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Price, PriceRepositoryPort } from "src/core/price";
import { PriceOrmEntity } from "src/infrastructure/database/price/price.orm-entity";
import { Repository } from "typeorm";

@Injectable()
export class PriceRepository implements PriceRepositoryPort {

    constructor(@InjectRepository(PriceOrmEntity) private readonly priceRepository: Repository<PriceOrmEntity>) { }

    async save(prices: Price[]): Promise<Price[]> {
        return await this.priceRepository.save(prices);
    }

    async delete(id: number): Promise<void> {
        await this.priceRepository.delete(id);
    }
}