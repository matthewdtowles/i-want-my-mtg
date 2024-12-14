import { Injectable } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardDto, CreateCardDto, UpdateCardDto } from "./api/card.dto";

@Injectable()
export class CardMapper {

    private rarityCache: { [key: string]: string } = {};

    dtosToEntities(cardDtos: CreateCardDto[] | UpdateCardDto[]): Card[] {
        return cardDtos.map((c: CreateCardDto | UpdateCardDto) => this.dtoToEntity(c));
    }

    dtoToEntity(cardDto: CreateCardDto | UpdateCardDto): Card {
        const card: Card = new Card();
        card.imgSrc = cardDto.imgSrc;
        card.isReserved = cardDto.isReserved;
        card.manaCost = cardDto.manaCost;
        card.name = cardDto.name;
        card.number = cardDto.number;
        card.originalText = cardDto.originalText;
        card.rarity = cardDto.rarity.toLowerCase();
        card.setCode = cardDto.setCode;
        card.url = cardDto.url;
        card.uuid = cardDto.uuid;
        return card;
    }

    readDtoToEntity(cardDto: CardDto): Card {
        const card: Card = new Card();
        card.id = cardDto.id;
        card.imgSrc = cardDto.imgSrc;
        card.isReserved = cardDto.isReserved;
        card.manaCost = this.manaForRepo(cardDto.manaCost);
        card.name = cardDto.name;
        card.number = cardDto.number;
        card.originalText = cardDto.originalText;
        card.rarity = cardDto.rarity.toLowerCase();
        card.setCode = cardDto.setCode;
        card.url = cardDto.url;
        card.uuid = cardDto.uuid;
        return card;
    }

    entitiesToDtos(cards: Card[]): CardDto[] {
        return cards.map((card: Card) => this.entityToDto(card));
    }

    entityToDto(card: Card): CardDto {
        const cardDto: CardDto = {
            id: card.id,
            imgSrc: card.imgSrc,
            isReserved: card.isReserved,
            manaCost: this.manaForView(card.manaCost),
            name: card.name,
            number: card.number,
            originalText: card.originalText,
            rarity: this.rarityForView(card.rarity),
            setCode: card.setCode,
            url: card.url,
            uuid: card.uuid,
        };
        return cardDto;
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

    private manaForRepo(manaCost: string[]): string {
        return manaCost ? manaCost.map((token) => `{${token}}`).join("") : null;
    }
}
