import { Card } from 'src/core/card/card';
import { CreateCardDto } from './dtos/create-card.dto';
import { CardDto } from './dtos/card.dto';
import { UpdateCardDto } from './dtos/update-card.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CardMapper {

    dtoToEntity(createCardDto: CreateCardDto): Card {
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

    entityToDto(card: Card): CardDto {
        const cardDto = new CardDto();
        cardDto.imgSrc = card.imgSrc;
        cardDto.isReserved = card.isReserved;
        // TODO: MUST test to ensure manacost is converted correctly!!
        cardDto.manaCost = this.mapManaToView(card.manaCost);
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

    updateDtoToEntity(updateCardDto: UpdateCardDto): Card {
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

    private mapManaToView(manaCost: string): string[] {
        return null !== manaCost ? manaCost.toLowerCase()
        .toLowerCase()
        .trim()
        .replaceAll('/', '')
        .replace('{', '')
        .replaceAll('}', '')
        .split('{') : null;
    }

    private mapManaToRepo(manaCost: string[]): string {
        return null;
    }
}