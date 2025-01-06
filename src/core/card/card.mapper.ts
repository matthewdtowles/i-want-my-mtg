import { Injectable } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { SetDto } from "src/core/set/api/set.dto";
import { Set } from "src/core/set/set.entity";
import { CardDto, CardImgType, CreateCardDto, UpdateCardDto } from "./api/card.dto";

@Injectable()
export class CardMapper {

    private readonly SCRYFALL_CARD_IMAGE_URL: string = "https://cards.scryfall.io";
    private rarityCache: { [key: string]: string } = {};

    dtosToEntities(cardDtos: CreateCardDto[] | UpdateCardDto[]): Card[] {
        return cardDtos.map((c: CreateCardDto | UpdateCardDto) => this.dtoToEntity(c));
    }

    dtoToEntity(cardDto: CreateCardDto | UpdateCardDto): Card {
        const card: Card = new Card();
        card.artist = cardDto.artist;
        card.imgSrc = cardDto.imgSrc;
        card.isReserved = cardDto.isReserved;
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
        const cardDto: CardDto = {
            id: card.id,
            artist: card.artist,
            imgSrc: this.buildImgSrc(card, imgType),
            isReserved: card.isReserved,
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
        return cardDto;
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