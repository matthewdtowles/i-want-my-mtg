import { Card } from "src/core/card/entities/card.entity";
import { CreateCardDto } from "./create-card.dto";
import { GetCardDto } from "./get-card.dto";
import { UpdateCardDto } from "./update-card.dto";

export class CardMapper {
    createEntity(createCardDto: CreateCardDto): Card {
        const card = new Card();
        card.imgSrc = createCardDto.imgSrc;
        card.isReserved = createCardDto.isReserved;
        card.manaCost = createCardDto.manaCost;
        card.name = createCardDto.name;
        card.number = createCardDto.number;
        card.originalText = createCardDto.originalText;
        card.rarity = createCardDto.rarity;
        // TODO:
        // card.set = createCardDto.setCode;
        card.url = createCardDto.url;
        card.uuid = createCardDto.uuid;
        return card;
    }

    toEntity(card: Card): GetCardDto {
        const cardDto = new GetCardDto();
        cardDto.imgSrc = card.imgSrc;
        cardDto.isReserved = card.isReserved;
        // TODO: MUST test to ensure manacost is converted correctly!!
        cardDto.manaCost = card.manaCost;
        cardDto.name = card.name;
        cardDto.number = card.number;
        cardDto.originalText = card.originalText;
        cardDto.rarity = card.rarity;
        // TODO:
        // card.set = getCardDto.setCode;
        cardDto.url = card.url;
        cardDto.uuid = card.uuid;
        return cardDto;
    }

    updateEntity(updateCardDto: UpdateCardDto): Card {
        const card = new Card();
        card.imgSrc = updateCardDto.imgSrc;
        card.isReserved = updateCardDto.isReserved;
        card.manaCost = updateCardDto.manaCost;
        card.name = updateCardDto.name;
        card.number = updateCardDto.number;
        card.originalText = updateCardDto.originalText;
        card.rarity = updateCardDto.rarity;
        // TODO:
        // card.set = updateCardDto.setCode;
        card.url = updateCardDto.url;
        card.uuid = updateCardDto.uuid;
        return card;
    }
}