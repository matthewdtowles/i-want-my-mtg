import { Injectable } from "@nestjs/common";
import { CardDto } from "src/adapters/http/card/card.dto";
import { CreateCardDto } from "src/adapters/http/card/create-card.dto";
import { CreateLegalityDto } from "src/adapters/http/card/create-legality.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import {
    Card,
    CardImgType,
    CardRarity,
    Format,
    Legality,
    LegalityStatus
} from "src/core/card";
import { Set } from "src/core/set";

@Injectable()
export class CardMapper {

    private readonly SCRYFALL_CARD_IMAGE_URL: string = "https://cards.scryfall.io";

    // TODO: update - should reflect ingestion input
    dtoToEntity(cardDto: CreateCardDto): Card {
        const card: Card = new Card();
        card.artist = cardDto.artist;
        card.hasFoil = cardDto.hasFoil;
        card.hasNonFoil = cardDto.hasNonFoil;
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
        card.id = cardDto.uuid;
        return card;
    }

    entitiesToDtos(cards: Card[], imgType: CardImgType): CardDto[] {
        return cards.map((card: Card) => this.entityToDto(card, imgType));
    }

    entityToDto(card: Card, imgType: CardImgType): CardDto {
        const dto: CardDto = {
            order: card.order,
            artist: card.artist,
            hasFoil: card.hasFoil,
            hasNonFoil: card.hasNonFoil,
            imgSrc: this.buildImgSrc(card, imgType),
            isReserved: card.isReserved,
            legalities: this.toLegalityDtos(card.legalities),
            manaCost: this.manaForView(card.manaCost),
            name: card.name,
            number: card.number,
            oracleText: card.oracleText,
            prices: Array.isArray(card?.prices) ? card.prices.map(p => (
                {
                    cardId: card.order,
                    normal: p.normal,
                    foil: p.foil,
                    date: p.date,
                })
            ) : [],
            rarity: card.rarity,
            set: card.set ? this.setEntityToDto(card.set) : null,
            setCode: card.setCode,
            type: card.type,
            id: card.id,
            url: this.buildCardUrl(card),
        };
        return dto;
    }

    entityToDtoForView(card: Card, imgType: CardImgType): CardDto {
        const dto: CardDto = this.entityToDto(card, imgType);
        return {
            ...dto,
            legalities: this.fillMissingFormats(dto)
        };
    }

    toLegalityEntities(dtos: CreateLegalityDto[]): Legality[] {
        return dtos?.reduce((entities: Legality[], dto: CreateLegalityDto) => {
            if (this.isValidLegalityDto(dto)) {
                const entity: Legality = this.toLegalityEntity(dto);
                if (entity) entities.push(entity);
            }
            return entities;
        }, []);
    }

    toLegalityEntity(dto: CreateLegalityDto): Legality {
        const entity: Legality = new Legality();
        entity.cardId = dto.cardId;
        entity.format = this.convertToFormat(dto.format);
        entity.status = this.convertToLegalityStatus(dto.status);
        return entity;
    }

    toLegalityDtos(entities: Legality[]): CreateLegalityDto[] {
        return entities?.reduce((dtos: CreateLegalityDto[], entity: Legality) => {
            if (this.isValidLegalityEntity(entity)) {
                const dto: CreateLegalityDto = this.toLegalityDto(entity);
                if (dto) dtos.push(dto);
            }
            return dtos;
        }, []);
    }

    toLegalityDto(entity: Legality): CreateLegalityDto {
        const dto: CreateLegalityDto = {
            cardId: entity?.cardId,
            format: entity?.format,
            status: entity?.status,
        };
        return dto;
    }

    private fillMissingFormats(card: CardDto): CreateLegalityDto[] {
        const existingLegalities: CreateLegalityDto[] = card.legalities || [];
        const formats: Format[] = Object.values(Format);
        const filledLegalities: CreateLegalityDto[] = formats.map(format => {
            const existingLegality: CreateLegalityDto | undefined = existingLegalities.find(l => l.format === format);
            if (existingLegality) {
                return existingLegality;
            }
            const newLegality: CreateLegalityDto = {
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

    private manaForView(manaCost: string): string[] | null {
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

    private isValidLegalityDto(dto: CreateLegalityDto): boolean {
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