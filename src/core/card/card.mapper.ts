import { Injectable, Logger } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardDto } from "./dto/card.dto";
import { CreateCardDto } from "./dto/create-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";

@Injectable()
export class CardMapper {
    private readonly LOGGER = new Logger(CardMapper.name);

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
        card.rarity = cardDto.rarity;
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
        card.manaCost = this.mapManaToRepo(cardDto.manaCost);
        card.name = cardDto.name;
        card.number = cardDto.number;
        card.originalText = cardDto.originalText;
        card.rarity = cardDto.rarity;
        card.setCode = cardDto.setCode;
        card.url = cardDto.url;
        card.uuid = cardDto.uuid;
        return card;
    }

    entitiesToDtos(cards: Card[]): CardDto[] {
        this.LOGGER.debug(`entitiesToDtos ${JSON.stringify(cards)}`);
        return cards.map((card: Card) => this.entityToDto(card));
    }

    entityToDto(card: Card): CardDto {
        const cardDto: CardDto = {
            id: card.id,
            imgSrc: card.imgSrc,
            isReserved: card.isReserved,
            manaCost: this.mapManaToView(card.manaCost),
            name: card.name,
            number: card.number,
            originalText: card.originalText,
            rarity: card.rarity,
            setCode: card.setCode,
            url: card.url,
            uuid: card.uuid,
        };
        return cardDto;
    }

    private mapManaToView(manaCost: string): string[] {
        return typeof manaCost === "string" ? manaCost
            .toLowerCase()
            .trim()
            .replaceAll("/", "")
            .replace("{", "")
            .replaceAll("}", "")
            .split("{")
            : null;
    }

    private mapManaToRepo(manaCost: string[]): string {
        return manaCost ? manaCost.map((token) => `{${token}}`).join("") : null;
    }
}
