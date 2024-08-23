import { Card } from 'src/core/card/card.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { CardDto } from './dto/card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

export class CardMapper {

    static dtosToEntities(cardDtos: CreateCardDto[] | UpdateCardDto[]): Card[] {
        const cards: Card[] = [];
        cardDtos.forEach(c => {
            cards.push(this.dtoToEntity(c));
        });
        return cards;
    }

    static dtoToEntity(cardDto: CreateCardDto | UpdateCardDto): Card {
        const card: Card = new Card();
        card.imgSrc = cardDto.imgSrc;
        card.isReserved = cardDto.isReserved;
        card.manaCost = cardDto.manaCost;
        card.name = cardDto.name;
        card.number = cardDto.number;
        card.originalText = cardDto.originalText;
        card.rarity = cardDto.rarity;
        // TODO:
        // card.set = createCardDto.setCode;
        card.url = cardDto.url;
        card.uuid = cardDto.uuid;
        return card;
    }

    static entitiesToDtos(cards: Card[]): CardDto[] {
        const cardDtos: CardDto[] = [];
        const totalCards: number = cards ? cards.length : 0;
        for(let i = 0; i < totalCards; i++) {
            cardDtos.push(this.entityToDto(cards[i]));
        }
        return cardDtos;
    }

    static entityToDto(card: Card): CardDto {
        const cardDto: CardDto = {
            id: card.id,
            imgSrc: card.imgSrc,
            isReserved: card.isReserved,
            manaCost: this.mapManaToView(card.manaCost),
            name: card.name,
            number: card.number,
            originalText: card.originalText,
            rarity: card.rarity,
            setCode: card && card.set ? card.set.setCode: null,
            url: card.url,
            uuid: card.uuid,
        };
        return cardDto;
    }

    private static mapManaToView(manaCost: string): string[] {
        return typeof manaCost === 'string' ? manaCost.toLowerCase()
            .trim()
            .replaceAll('/', '')
            .replace('{', '')
            .replaceAll('}', '')
            .split('{') : null;
    }

    private static mapManaToRepo(manaCost: string[]): string {
        return null;
    }
}