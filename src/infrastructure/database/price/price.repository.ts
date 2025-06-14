import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Price } from "src/core/price/price.entity";
import { PriceRepositoryPort } from "src/core/price/price.repository.port";
import { PriceOrmEntity } from "src/infrastructure/database/price/price.orm-entity";
import { Repository } from "typeorm";

@Injectable()
export class PriceRepository implements PriceRepositoryPort {

    constructor(@InjectRepository(PriceOrmEntity) private readonly priceRepository: Repository<PriceOrmEntity>) { }

    async save(prices: Price[]): Promise<void> {
        await this.priceRepository.save(prices);
    }

    async delete(id: number): Promise<void> {
        await this.priceRepository.delete(id);
    }
}