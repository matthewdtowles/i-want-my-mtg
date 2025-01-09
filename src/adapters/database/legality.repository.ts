import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LegalityRepositoryPort } from "src/core/legality/api/legality.repository.port";
import { Legality } from "src/core/legality/legality.entity";
import { Repository } from "typeorm";

export class LegalityRepository implements LegalityRepositoryPort{
    private readonly LOGGER: Logger = new Logger(LegalityRepository.name);

    constructor(@InjectRepository(Legality) private readonly legalityRepository: Repository<Legality>) { }

    async save(legalities: Legality[]): Promise<Legality[]> {
        this.LOGGER.debug(`Save ${legalities.length} total legalities`);
        return await this.legalityRepository.save(legalities);
    }

    async findByCard(cardId: number): Promise<Legality[]> {
        this.LOGGER.debug(`Find all legalities by card id ${cardId}`);
        return await this.legalityRepository.find({
            where: { cardId: cardId, },
        });
    }

    async findByCardAndFormat(_cardId: number, _format: string): Promise<Legality | null> {
        this.LOGGER.debug(`Find legality by id ${_cardId} and format ${_format}`);
        return await this.legalityRepository.findOne({
            where: { cardId: _cardId, format: _format, },
        });
    }
}