import { Inject, Injectable, Logger } from "@nestjs/common";
import { Format, LegalityStatus } from "src/core/card/api/legality.dto";
import { CardDto, CardImgType, CreateCardDto, UpdateCardDto } from "./api/card.dto";
import { CardRepositoryPort } from "./api/card.repository.port";
import { CardServicePort } from "./api/card.service.port";
import { Card } from "./card.entity";
import { CardMapper } from "./card.mapper";
import { Legality } from "./legality.entity";

@Injectable()
export class CardService implements CardServicePort {

    private readonly LOGGER = new Logger(CardService.name);

    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(CardMapper) private readonly mapper: CardMapper,
    ) { }

    async save(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<CardDto[]> {
        this.LOGGER.debug(`save ${cardDtos.length} cards`);
        if (!cardDtos || cardDtos.length === 0) {
            return [];
        }
        // TODO: ensure we do NOT save NOT LEGAL legality statuses
        // TODO: save card then save legality:
        // TODO: update each legality with cardId after card saved
        const cardsToSave: Card[] = await this.prepareSave(cardDtos);
        const savedCards: Card[] = await this.repository.save(cardsToSave);
        return this.mapper.entitiesToDtos(savedCards, CardImgType.SMALL);
    }

    async findAllInSet(setCode: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllInSet ${setCode}`);
        const foundCards: Card[] = await this.repository.findAllInSet(setCode);
        for (const card of foundCards) {
            card.legalities = await this.fillMissingFormats(card.id);
        }
        return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
    }

    async findAllWithName(name: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllWithName ${name}`);
        const foundCards: Card[] = await this.repository.findAllWithName(name);
        const legality = await this.fillMissingFormats(foundCards[0].id);
        for (const card of foundCards) {
            card.legalities = legality;
        }
        return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
    }

    async findById(id: number): Promise<CardDto | null> {
        this.LOGGER.debug(`findById ${id}`);
        const foundCard: Card = await this.repository.findById(id);
        if (foundCard) {
            foundCard.legalities = await this.fillMissingFormats(foundCard.id);
        }
        return this.mapper.entityToDto(foundCard, CardImgType.NORMAL);
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<CardDto> {
        this.LOGGER.debug(`findBySetCodeAndNumber ${setCode} #${number}`);
        const foundCard: Card = await this.repository.findBySetCodeAndNumber(setCode, number);
        if (foundCard) {
            foundCard.legalities = await this.fillMissingFormats(foundCard.id);
        }
        return this.mapper.entityToDto(foundCard, CardImgType.NORMAL);
    }

    async findByUuid(uuid: string): Promise<CardDto | null> {
        this.LOGGER.debug(`findByUuid ${uuid}`);
        const foundCard: Card = await this.repository.findByUuid(uuid);
        if (foundCard) {
            foundCard.legalities = await this.fillMissingFormats(foundCard.id);
        }
        return this.mapper.entityToDto(foundCard, CardImgType.NORMAL);
    }

    private async fillMissingFormats(cardId: number): Promise<Legality[]> {
        const card: Card = await this.repository.findById(cardId);
        const existingLegalities: Legality[] = card.legalities || [];
        const formats: Format[] = Object.values(Format);
        const filledLegalities: Legality[] = formats.map(format => {
            const existingLegality: Legality | undefined = existingLegalities.find(l => l.format === format);
            if (existingLegality) {
                return existingLegality;
            }
            const newLegality = new Legality();
            newLegality.cardId = cardId;
            newLegality.format = format;
            newLegality.status = null;
            return newLegality;
        });
        return filledLegalities;
    }

    private async prepareSave(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<Card[]> {
        const cardsToSave: Card[] = [];
        // for each card we try to save,
        // if card does not already exist, create new card
        // if card already exists, update card with new data
        for (const dto of cardDtos) {
            let card: Card = await this.repository.findBySetCodeAndNumber(dto.setCode, Number(dto.number));
            if (!card) {
                card = this.mapper.dtoToEntity(dto);
            } else {
                const _legalities: Legality[] = this.mapper.dtoToEntity(dto).legalities || [];
                card = {
                    ...card,
                    ...dto,
                    legalities: _legalities,
                };
            }
            // get all legalities for each card
            // for each format, if legality does not exist, delete it from db,
            // otherwise set legality status for format¸
            const legalities: Legality[] = card.legalities || [];
            card.legalities = this.updateLegalities(legalities);;
            cardsToSave.push(card);
        }
        return cardsToSave;
    }

    private updateLegalities(legalities: Legality[]): Legality[] {
        const formats = Object.values(Format);
        const updatedLegalities = formats.map(format => {
            const existingLegality = legalities.find(l => l.format === format);
            if (existingLegality) {
                return existingLegality;
            }
            const newLegality = new Legality();
            newLegality.format = format;
            newLegality.status = null;
            return newLegality;
        });
        return updatedLegalities;
    }
}
