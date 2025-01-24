import { Injectable, Logger } from "@nestjs/common";
import { Format, LegalityDto, LegalityStatus } from "src/core/card/api/legality.dto";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";
import { SetDto } from "src/core/set/api/set.dto";
import { Set } from "src/core/set/set.entity";
import { CardDto, CardImgType, CreateCardDto, UpdateCardDto } from "./api/card.dto";

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
        card.rarity = cardDto.rarity.toLowerCase();
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
            // FIXME: this is not exclusive to the view layer!!!!!! Should NOT map NOT LEGAL for missing formats!!!!!!8
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

    toLegalityEntities(dtos: LegalityDto[]): Legality[] {
        return dtos.map((dto: LegalityDto) => this.toLegalityEntity(dto));
    }

    toLegalityEntity(dto: LegalityDto): Legality {
        if (!dto || !dto.format || !dto.status) {
            this.LOGGER.error(`Invalid LegalityDto: ${JSON.stringify(dto)}`);
            return null;
        }
        const entity: Legality = new Legality();
        entity.cardId = dto.cardId;
        entity.format = dto.format;
        entity.status = dto.status;
        return entity;
    }

    toLegalityDtos(entities: Legality[]): LegalityDto[] {
        return entities?.map((entity: Legality) => this.toLegalityDto(entity)) || [];
    }

    toLegalityDto(entity: Legality): LegalityDto | null {
        if (!entity || !entity.format || !entity.status) {
            this.LOGGER.error(`Invalid Legality: ${JSON.stringify(entity)}`);
            return null;
        }
        const dto: LegalityDto = {
            cardId: entity.cardId,
            format: entity.format,
            status: entity.status,
        };
        return dto;
    }

    legalitiesForView(card: Card): LegalityDto[] {
        const legalitiesMap = new Map<Format, LegalityDto>();

        // Add existing legalities to the map
        if (!card || !card.legalities) {
            this.LOGGER.debug(`No legalities for ${card.name}`);
            return [];
        }
        this.LOGGER.debug(`Legalities for ${card.name}: ${JSON.stringify(card.legalities)}`);
        card.legalities.forEach(legality => legalitiesMap.set(legality.format as Format, legality));

        // Ensure every format is represented
        Object.values(Format).forEach(format => {
            this.LOGGER.debug(`Checking format ${format}`);
            const legality: LegalityDto = legalitiesMap.get(format);
            if (!legality || !Object.values(LegalityStatus).includes(legality.status as LegalityStatus)) {
                this.LOGGER.debug(`Adding format ${format} with status Not Legal`);
                legalitiesMap.set(format, {
                    cardId: card.id,
                    format,
                    status: "Not Legal",
                });
            } else {
                this.LOGGER.debug(`Format ${format} already exists`);
            }
        });

        const legalities: LegalityDto[] = Array.from(legalitiesMap.values());
        this.LOGGER.debug(`Mapped legalities for ${card.name}: ${JSON.stringify(legalities)}`);
        return legalities;
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

}