import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { Price } from "src/core/price/price.entity";
import { Repository } from "typeorm";

@Injectable()
export class PriceRepository implements PriceRepositoryPort {
    private readonly LOGGER = new Logger(PriceRepository.name);

    constructor(@InjectRepository(Price) private readonly priceRepository: Repository<Price>) { }

    async save(prices: Price[]): Promise<Price[]> {
        if (!prices) {
            throw new Error(`Invalid input`);
        }
        this.LOGGER.debug(`saving price`);
        return await this.priceRepository.save(prices);
    }

    async saveOne(price: Price): Promise<Price> {
        if (!price) {
            throw new Error(`Invalid input`);
        }
        this.LOGGER.debug(`saving price`);
        return await this.priceRepository.save(price);
    }

    async findByCardId(cardId: number): Promise<Price> {
        this.LOGGER.debug(`findByCardId: ${cardId}`);
        return await this.priceRepository.findOne({
            where: { card: { id: cardId } },
        });
    }

    async findByCardName(cardName: string): Promise<Price[]> {
        this.LOGGER.debug(`findByCardName: ${cardName}`);
        return await this.priceRepository.find({
            where: { card: { name: cardName } },
        });
    }
    async findByCardNameAndSetCode(cardName: string, setCode: string): Promise<Price>{
        this.LOGGER.debug(`findByCardNameAndSetCode: ${cardName} ${setCode}`);
        return await this.priceRepository.findOne({
            where: { card: { name: cardName, setCode } },
        });
    }

    async findByCardSet(setCode: string): Promise<Price[]> {
        this.LOGGER.debug(`findByCardSet: ${setCode}`);
        return await this.priceRepository.find({
            where: { card: { setCode } },
        });
    }

    async findById(id: number): Promise<Price> {
        this.LOGGER.debug(`findById price: ${id}`);
        return this.priceRepository.findOne({ where: { id } });
    }

    async delete(id: number): Promise<void> {
        this.LOGGER.debug(`delete price: ${id}`);
        await this.priceRepository.delete(id);
    }

}