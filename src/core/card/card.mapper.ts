import { Card } from 'src/core/card/card.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { CardDto } from './dto/card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { SetMapper } from '../set/set.mapper';

export class CardMapper {

    static dtoToEntity(createCardDto: CreateCardDto): Card {
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
            set: SetMapper.entityToDto(card.set),
            url: card.url,
            uuid: card.uuid,
        };
        return cardDto;
    }

    static updateDtoToEntity(updateCardDto: UpdateCardDto): Card {
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

    private static mapManaToView(manaCost: string): string[] {
        return null !== manaCost ? manaCost.toLowerCase()
            .toLowerCase()
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