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

    /*
    
       // TODO: move to CardMapper in core
    private mapToEntity(card: Card): CardEntity {
        const cardEntity: CardEntity = new CardEntity();
        cardEntity.id = card.id;
        cardEntity.imgSrc = card.imgSrc;
        cardEntity.isReserved = card.isReserved;
        cardEntity.manaCost = card.manaCost;
        cardEntity.name = card.name;
        cardEntity.number = card.number;
        cardEntity.originalText = card.originalText;
        cardEntity.rarity = card.rarity;
        cardEntity.set = card.set;
        cardEntity.url = card.url;
        cardEntity.uuid = card.uuid;
        return cardEntity;
    }

    // TODO: move to CardMapper in core
    private mapFromEntity(cardEntity: CardEntity): Card {
        const card: CardEntity = new CardEntity();
        card.id = cardEntity.id;
        card.imgSrc = cardEntity.imgSrc;
        card.isReserved = cardEntity.isReserved;
        card.manaCost = cardEntity.manaCost;
        card.name = cardEntity.name;
        card.number = cardEntity.number;
        card.originalText = cardEntity.originalText;
        card.rarity = cardEntity.rarity;
        card.set = cardEntity.set;
        card.url = cardEntity.url;
        card.uuid = cardEntity.uuid;
        return card;
    }
    
    */
}