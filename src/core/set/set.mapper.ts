import { Inject, Injectable } from "@nestjs/common";
import { CreateSetDto, Set, SetDto } from "src/core/set";
import { CardImgType, CardMapper } from "src/core/card";

@Injectable()
export class SetMapper {
    constructor(@Inject(CardMapper) private readonly cardMapper: CardMapper) { }

    dtoToEntity(createSetDto: CreateSetDto): Set {
        const set: Set = new Set();
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

    dtosToEntities(setDtos: CreateSetDto[]): Set[] {
        return setDtos.map(dto => this.dtoToEntity(dto));
    }

    entityToDto(set: Set): SetDto {
        return {
            baseSize: set.baseSize,
            block: set.block,
            cards: set.cards ? this.cardMapper.entitiesToDtos(set.cards, CardImgType.SMALL) : [],
            code: set.code,
            keyruneCode: set.keyruneCode.toLowerCase(),
            name: set.name,
            parentCode: set.parentCode,
            releaseDate: set.releaseDate,
            type: set.type,
            url: this.buildSetUrl(set.code),
        }
    }

    entitiesToDtos(sets: Set[]): SetDto[] {
        return sets.map(s => this.entityToDto(s));
    }

    private buildSetUrl(code: string): string {
        return "sets/" + code.toLowerCase();
    }
}
