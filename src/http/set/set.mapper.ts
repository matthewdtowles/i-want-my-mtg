import { CreateSetDto } from './dtos/create-set.dto';
import { SetDto } from './dtos/set.dto';
import { CardDto } from '../card/dtos/card.dto';
import { Card } from 'src/core/card/card';
import { Set } from 'src/core/set/set';
import { CardMapper } from '../card/card.mapper';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SetMapper {

    constructor(private readonly cardMapper: CardMapper) {}

    dtoToEntity(createSetDto: CreateSetDto): Set {
        const set = new Set();
        set.name = createSetDto.name;
        return set;
    }

    entityToDto(set: Set): SetDto {
        const dto: SetDto = new SetDto();
        dto.block = set.block;
        dto.cards = this.mapCardResponses(set.cards);
        dto.code = set.setCode.toUpperCase();
        dto.keyruneCode = set.keyruneCode.toLowerCase();
        dto.name = set.name;
        dto.releaseDate = set.releaseDate;
        dto.url = this.buildSetUrl(set.setCode);
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
            const dto: SetDto = new SetDto();
            dto.block = s.block;
            dto.code = s.setCode.toUpperCase();
            dto.keyruneCode = s.keyruneCode.toLowerCase();
            dto.name = s.name;
            dto.releaseDate = s.releaseDate;
            dto.url = this.buildSetUrl(s.setCode);
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