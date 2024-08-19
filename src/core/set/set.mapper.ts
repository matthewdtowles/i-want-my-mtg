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

    // private mapFromEntity(setEntity: SetEntity): Set {
    //     const set = new Set();
    //     set.baseSize = setEntity.baseSize;
    //     set.block = setEntity.block;
    //     set.cards = setEntity.cards;
    //     set.keyruneCode = setEntity.keyruneCode;
    //     set.name = setEntity.name;
    //     set.releaseDate = setEntity.releaseDate;
    //     set.setCode = setEntity.setCode;
    //     set.type = setEntity.type;
    //     return set;
    // }
    // private mapToEntity(set: Set): SetEntity {
    //     const setEntity = new SetEntity();
    //     setEntity.baseSize = set.baseSize;
    //     setEntity.block = set.block;
    //     setEntity.cards = set.cards;
    //     setEntity.keyruneCode = set.keyruneCode;
    //     setEntity.name = set.name;
    //     setEntity.releaseDate = set.releaseDate;
    //     setEntity.setCode = set.setCode;
    //     setEntity.type = set.type;
    //     return setEntity;
    // }
}