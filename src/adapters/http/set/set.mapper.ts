import { Injectable } from "@nestjs/common";
import { CardMapper } from "src/adapters/http/card/card.mapper";
import { CreateSetDto, SetDto } from "src/adapters/http/set/set.dto";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { Set } from "src/core/set/set.entity";

@Injectable()
export class SetMapper {

    dtoToEntity(createSetDto: CreateSetDto): Set {
        return new Set({
            code: createSetDto.code,
            baseSize: createSetDto.baseSize,
            block: createSetDto.block,
            keyruneCode: createSetDto.keyruneCode,
            name: createSetDto.name,
            parentCode: createSetDto.parentCode,
            releaseDate: createSetDto.releaseDate,
            type: createSetDto.type,
        });
    }

    dtosToEntities(setDtos: CreateSetDto[]): Set[] {
        return setDtos.map(dto => this.dtoToEntity(dto));
    }

    entityToDto(set: Set): SetDto {
        return {
            baseSize: set.baseSize,
            block: set.block,
            cards: set.cards ? CardMapper.entitiesToDtos(set.cards, CardImgType.SMALL) : [],
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
