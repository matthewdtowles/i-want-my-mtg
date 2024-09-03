import { Card } from 'src/core/card/card.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { CardDto } from './dto/card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CardMapper {

    dtosToEntities(cardDtos: CreateCardDto[] | UpdateCardDto[]): Card[] {
        const cards: Card[] = [];
        cardDtos.forEach(c => {
            cards.push(this.dtoToEntity(c));
        });
        return cards;
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
        const cardDtos: CardDto[] = [];
        const totalCards: number = cards ? cards.length : 0;
        for(let i = 0; i < totalCards; i++) {
            cardDtos.push(this.entityToDto(cards[i]));
        }
        return cardDtos;
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
            setCode: card && card.set ? card.set.code: null,
            url: card.url,
            uuid: card.uuid,
        };
        return cardDto;
    }

    private mapManaToView(manaCost: string): string[] {
        return typeof manaCost === 'string' ? manaCost.toLowerCase()
            .trim()
            .replaceAll('/', '')
            .replace('{', '')
            .replaceAll('}', '')
            .split('{') : null;
    }

    private mapManaToRepo(manaCost: string[]): string {
        return manaCost ? manaCost.map(token => `{${token}}`).join('') : undefined;
    }
}