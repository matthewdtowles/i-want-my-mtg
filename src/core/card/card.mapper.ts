import { Injectable, Logger } from "@nestjs/common";
import { Format, LegalityDto, LegalityStatus } from "src/core/card/api/legality.dto";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";
import { SetDto } from "src/core/set/api/set.dto";
import { Set } from "src/core/set/set.entity";
import { CardDto, CardImgType, CardRarity, CreateCardDto, UpdateCardDto } from "./api/card.dto";

@Injectable()
export class CardMapper {

    private readonly LOGGER: Logger = new Logger(CardMapper.name);
    private readonly SCRYFALL_CARD_IMAGE_URL: string = "https://cards.scryfall.io";
    private rarityCache: { [key: string]: string } = {};


    dtosToEntities(cardDtos: CreateCardDto[] | UpdateCardDto[]): Card[] {
        this.LOGGER.debug(`dtosToEntities`);
        return cardDtos.map((c: CreateCardDto | UpdateCardDto) => this.dtoToEntity(c));
    }

    dtoToEntity(cardDto: CreateCardDto | UpdateCardDto): Card {
        const card: Card = new Card();
        card.artist = cardDto.artist;
        card.imgSrc = cardDto.imgSrc;
        card.isReserved = cardDto.isReserved;
        card.legalities = this.toLegalityEntities(cardDto.legalities);
        card.manaCost = cardDto.manaCost;
        card.name = cardDto.name;
        card.number = cardDto.number;
        card.oracleText = cardDto.oracleText;
        card.rarity = this.convertToCardRarity(cardDto.rarity);
        card.setCode = cardDto.setCode;
        card.type = cardDto.type;
        card.uuid = cardDto.uuid;
        return card;
    }

    entitiesToDtos(cards: Card[], imgType: CardImgType): CardDto[] {
        return cards.map((card: Card) => this.entityToDto(card, imgType));
    }

    entityToDto(card: Card, imgType: CardImgType): CardDto {
        const dto: CardDto = {
            id: card.id,
            artist: card.artist,
            imgSrc: this.buildImgSrc(card, imgType),
            isReserved: card.isReserved,
            legalities: this.toLegalityDtos(card.legalities),
            manaCost: this.manaForView(card.manaCost),
            name: card.name,
            number: card.number,
            oracleText: card.oracleText,
            rarity: this.rarityForView(card.rarity),
            set: card.set ? this.setEntityToDto(card.set) : null,
            setCode: card.setCode,
            type: card.type,
            uuid: card.uuid,
            url: this.buildCardUrl(card),
        };
        return dto;
    }

    entitiesToDtosForView(cards: Card[], imgType: CardImgType): CardDto[] {
        return cards.map((card: Card) => this.entityToDtoForView(card, imgType));
    }

    entityToDtoForView(card: Card, imgType: CardImgType): CardDto {
        const dto: CardDto = this.entityToDto(card, imgType);
        return {
            ...dto,
            legalities: this.fillMissingFormats(dto)
        };
    }

    toLegalityEntities(dtos: LegalityDto[]): Legality[] {
        return dtos?.reduce((entities: Legality[], dto: LegalityDto) => {
            if (this.isValidLegalityDto(dto)) {
                const entity: Legality = this.toLegalityEntity(dto);
                if (entity) {
                    entities.push(entity);
                }
            } else {
                this.LOGGER.debug(`Invalid LegalityDto: ${JSON.stringify(dto)}`);
            }
            return entities;
        }, []);
    }

    toLegalityEntity(dto: LegalityDto): Legality {
        const entity: Legality = new Legality();
        entity.cardId = dto.cardId;
        entity.format = this.convertToFormat(dto.format);
        entity.status = this.convertToLegalityStatus(dto.status);
        return entity;
    }

    toLegalityDtos(entities: Legality[]): LegalityDto[] {
        return entities?.reduce((dtos: LegalityDto[], entity: Legality) => {
            if (this.isValidLegalityEntity(entity)) {
                const dto: LegalityDto = this.toLegalityDto(entity);
                if (dto) {
                    dtos.push(dto);
                }
            } else {
                this.LOGGER.debug(`Invalid Legality: ${JSON.stringify(entity)}`);
            }
            return dtos;
        }, []);
    }

    toLegalityDto(entity: Legality): LegalityDto {
        const dto: LegalityDto = {
            cardId: entity?.cardId,
            format: entity?.format,
            status: entity?.status,
        };
        return dto;
    }

    private fillMissingFormats(card: CardDto): LegalityDto[] {
        const existingLegalities: LegalityDto[] = card.legalities || [];
        const formats: Format[] = Object.values(Format);
        const filledLegalities: LegalityDto[] = formats.map(format => {
            const existingLegality: LegalityDto | undefined = existingLegalities.find(l => l.format === format);
            if (existingLegality) {
                return existingLegality;
            }
            const newLegality: LegalityDto = {
                cardId: card.id,
                format: format,
                status: "Not Legal"
            }
            return newLegality;
        });
        return filledLegalities;
    }

    private setEntityToDto(set: Set): SetDto {
        return {
            ...set,
            cards: set.cards ? set.cards.map(c => this.entityToDto(c, CardImgType.SMALL)) : [],
            url: this.buildSetUrl(set),
        };
    }

    private rarityForView(word: string): string {
        if (!word) {
            return word;
        }
        if (this.rarityCache[word]) {
            return this.rarityCache[word];
        }
        const rarity = word.charAt(0).toUpperCase() + word.slice(1);
        this.rarityCache[word] = rarity;
        return rarity;
    }

    private manaForView(manaCost: string): string[] {
        return typeof manaCost === "string" ? manaCost
            .toLowerCase()
            .trim()
            .replaceAll("/", "")
            .replace("{", "")
            .replaceAll("}", "")
            .split("{")
            : null;
    }

    private buildCardUrl(card: Card): string {
        return `/card/${card.setCode.toLowerCase()}/${card.number}`;
    }

    private buildSetUrl(set: Set): string {
        return `/set/${set.code.toLowerCase()}`;
    }

    private buildImgSrc(card: Card, size: CardImgType): string {
        return `${this.SCRYFALL_CARD_IMAGE_URL}/${size}/front/${card.imgSrc}`;
    }

    private isValidLegalityDto(dto: LegalityDto): boolean {
        return this.isValidlegality(dto?.format, dto?.status);
    }

    private isValidLegalityEntity(entity: Legality): boolean {
        return this.isValidlegality(entity?.format, entity?.status);
    }

    private isValidlegality(format: string, status: string): boolean {
        const validFormat: boolean = Object.values(Format).includes(format?.toLowerCase() as Format);
        const validStatus: boolean = Object.values(LegalityStatus).includes(status?.toLowerCase() as LegalityStatus);
        return validFormat && validStatus
    }

    private convertToCardRarity(rarity: string): CardRarity {
        if (Object.values(CardRarity).includes(rarity as CardRarity)) {
            return rarity as CardRarity;
        }
        throw new Error(`Invalid rarity value: ${rarity}`);
    }

    private convertToFormat(format: string): Format {
        if (Object.values(Format).includes(format as Format)) {
            return format as Format;
        }
        throw new Error(`Invalid format value: ${format}`);
    }

    private convertToLegalityStatus(status: string): LegalityStatus {
        if (Object.values(LegalityStatus).includes(status as LegalityStatus)) {
            return status as LegalityStatus;
        }
        throw new Error(`Invalid status value: ${status}`);
    }
}