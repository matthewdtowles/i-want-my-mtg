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

    async save(priceDto: CreatePriceDto): Promise<PriceDto> {
        const card: Card = await this.cardRepository.findByUuid(priceDto.cardUuid);
        if (!card) {
            throw new Error(`Card with UUID ${priceDto.cardUuid} not found`);
        }
        const priceEntity: Price = this.mapper.toEntity(priceDto, card);
        return await this.priceRepository.save(priceEntity).then((savedEntity) =>
            this.mapper.toDto(savedEntity)
        );
    }

    async saveMany(priceDtos: CreatePriceDto[]): Promise<PriceDto[]> {
        const priceEntities: Price[] = await Promise.all(
            priceDtos.map(async (p) => {
                const card: Card = await this.cardRepository.findByUuid(p.cardUuid);
                if (!card) {
                    throw new Error(`Card with UUID ${p.cardUuid} not found`);
                }
                return this.mapper.toEntity(p, card);
            })
        );
        return await this.priceRepository.saveMany(priceEntities).then((savedEntities) =>
            savedEntities.map((e) => this.mapper.toDto(e))
        );
    }

    async findByCardId(cardId: number): Promise<PriceDto> {
        return await this.priceRepository.findByCardId(cardId)
            .then((entity) => this.mapper.toDto(entity));
    }

    async findByCardName(cardName: string): Promise<PriceDto[]> {
        return await this.priceRepository.findByCardName(cardName)
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async findByCardNameAndSetCode(cardName: string, setCode: string): Promise<PriceDto> {
        return await this.priceRepository.findByCardNameAndSetCode(cardName, setCode)
            .then((entity) => this.mapper.toDto(entity));
    }

    async findByCardSet(setCode: string): Promise<PriceDto[]> {
        return await this.priceRepository.findByCardSet(setCode)
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async findById(id: number): Promise<PriceDto> {
        return await this.priceRepository.findById(id)
            .then((entity: Price) => this.mapper.toDto(entity));
    }

    async delete(id: number): Promise<void> {
        return await this.priceRepository.delete(id);
    }
}