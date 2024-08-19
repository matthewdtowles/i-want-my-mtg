import { CreateSetDto } from './dto/create-set.dto';
import { SetDto } from './dto/set.dto';
import { CardDto } from '../card/dto/card.dto';
import { Card } from 'src/core/card/card.entity';
import { Set } from 'src/core/set/set.entity';
import { Injectable } from '@nestjs/common';
import { CardMapper } from '../card/card.mapper';

@Injectable()
export class SetMapper {

    constructor(private readonly cardMapper: CardMapper) {}

    dtoToEntity(createSetDto: CreateSetDto): Set {
        const set = new Set();
        set.name = createSetDto.name;
        return set;
    }

    entityToDto(set: Set): SetDto {
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
    entitiesToDtos(sets: Set[]): SetDto[] {
        const setDtos = [];
        sets.forEach(s => {
            setDtos.push(this.entityToDto(s));
        });
        return setDtos;
    }

    private mapCardResponses(cards: Card[]): CardDto[] {
        const cardResponses: CardDto[] = [];
        cards.forEach(c => {
            cardResponses.push(this.cardMapper.entityToDto(c));
        });
        return cardResponses;
    }

    private buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }
}