import { Logger, Inject } from "@nestjs/common";
import { PriceDto } from "src/core/price/api/price.dto";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceServicePort } from "src/core/price/api/price.service.port";
import { Price } from "src/core/price/price.entity";
import { PriceMapper } from "src/core/price/price.mapper";

export class PriceService implements PriceServicePort {

    constructor(
        @Inject(PriceRepositoryPort) private readonly repository: PriceRepositoryPort,
        @Inject(PriceMapper) private readonly mapper: PriceMapper,
    ) { }

    async save(prices: PriceDto[]): Promise<PriceDto[]> {
        return await this.repository.save(prices.map((p) => this.mapper.toEntity(p)))
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async saveOne(price: PriceDto): Promise<PriceDto> {
        return await this.repository.saveOne(this.mapper.toEntity(price))
            .then((entity) => this.mapper.toDto(entity));
    }

    async findByCardId(cardId: number): Promise<PriceDto> {
        return await this.repository.findByCardId(cardId)
            .then((entity) => this.mapper.toDto(entity));
    }

    async findByCardName(cardName: string): Promise<PriceDto[]> {
        return await this.repository.findByCardName(cardName)
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async findByCardNameAndSetCode(cardName: string, setCode: string): Promise<PriceDto> {
        return await this.repository.findByCardNameAndSetCode(cardName, setCode)
            .then((entity) => this.mapper.toDto(entity));
    }

    async findByCardSet(setCode: string): Promise<PriceDto[]> {
        return await this.repository.findByCardSet(setCode)
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async findById(id: number): Promise<PriceDto> {
        return await this.repository.findById(id)
            .then((entity: Price) => this.mapper.toDto(entity));
    }
    async delete(id: number): Promise<void> {
        return await this.repository.delete(id);
    }
}