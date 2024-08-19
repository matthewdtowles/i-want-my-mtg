import { CreateSetDto } from './dto/create-set.dto';
import { SetDto } from './dto/set.dto';
import { CardDto } from '../card/dto/card.dto';
import { Card } from 'src/core/card/card.entity';
import { Set } from 'src/core/set/set.entity';
import { CardMapper } from '../card/card.mapper';

export class SetMapper {

    static dtoToEntity(createSetDto: CreateSetDto): Set {
        const set = new Set();
        set.name = createSetDto.name;
        return set;
    }

    static entityToDto(set: Set): SetDto {
        const dto: SetDto = {
            baseSize: set.baseSize,
            block: set.block,
            cards: this.mapCardResponses(set.cards),
            code: set.setCode.toUpperCase(),
            keyruneCode: set.keyruneCode.toLowerCase(),
            name: set.name,
            releaseDate: set.releaseDate,
            url: this.buildSetUrl(set.setCode),
            type: set.type,
        };
        return dto;
    }

    /**
     * Maps array of Set entities meta-data to array of GetSetDtos
     * 
     * @param sets 
     * @returns 
     */
    static entitiesToDtos(sets: Set[]): SetDto[] {
        const setDtos = [];
        sets.forEach(s => {
            setDtos.push(this.entityToDto(s));
        });
        return setDtos;
    }

    private static mapCardResponses(cards: Card[]): CardDto[] {
        const cardResponses: CardDto[] = [];
        cards.forEach(c => {
            cardResponses.push(CardMapper.entityToDto(c));
        });
        return cardResponses;
    }

    private static buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }
}