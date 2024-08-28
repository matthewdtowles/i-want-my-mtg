import { Set } from 'src/core/set/set.entity';
import { CardMapper } from '../card/card.mapper';
import { CreateSetDto } from './dto/create-set.dto';
import { SetDto } from './dto/set.dto';
import { UpdateSetDto } from './dto/update-set.dto';

export class SetMapper {

    static dtosToEntities(setDtos: CreateSetDto[] | UpdateSetDto[]): Set[] {
        const sets: Set[] = [];
        setDtos.forEach(s => {
            sets.push(SetMapper.dtoToEntity(s));
        });
        return sets;
    }

    static dtoToEntity(createSetDto: CreateSetDto): Set {
        const set = new Set();
        set.baseSize = createSetDto.baseSize;
        set.block = createSetDto.block;
        set.cards = [];
        set.keyruneCode = createSetDto.keyruneCode;
        set.name = createSetDto.name;
        set.parentCode = createSetDto.parentCode;
        set.releaseDate = createSetDto.releaseDate;
        set.code = createSetDto.code;
        set.type = createSetDto.type;
        return set;
    }

    static entityToDto(set: Set): SetDto {
        const dto: SetDto = {
            baseSize: set.baseSize,
            block: set.block,
            cards: CardMapper.entitiesToDtos(set.cards),
            code: set.code.toUpperCase(),
            keyruneCode: set.keyruneCode.toLowerCase(),
            name: set.name,
            parentCode: set.parentCode,
            releaseDate: set.releaseDate,
            type: set.type,
            url: SetMapper.buildSetUrl(set.code),
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
            setDtos.push(SetMapper.entityToDto(s));
        });
        return setDtos;
    }

    private static buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }
}