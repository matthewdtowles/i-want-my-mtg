import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Price } from "src/core/price/price.entity";
import { PriceRepositoryPort } from "src/core/price/price.repository.port";
import { PriceMapper } from "src/database/price/price.mapper";
import { PriceOrmEntity } from "src/database/price/price.orm-entity";
import { Repository } from "typeorm";

@Injectable()
export class PriceRepository implements PriceRepositoryPort {

    constructor(@InjectRepository(PriceOrmEntity) private readonly priceRepository: Repository<PriceOrmEntity>) { }

    async save(prices: Price[]): Promise<void> {
        const ormPrices: PriceOrmEntity[] = prices.map((p: Price) => PriceMapper.toOrmEntity(p));
        await this.priceRepository.save(ormPrices);
    }

    async delete(id: number): Promise<void> {
        await this.priceRepository.delete(id);
    }
}