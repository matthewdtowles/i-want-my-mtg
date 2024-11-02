import { Inject, Injectable, Logger } from "@nestjs/common";
import { Set } from "src/core/set/set.entity";
import { CardMapper } from "../card/card.mapper";
import { CreateSetDto } from "./dto/create-set.dto";
import { SetDto } from "./dto/set.dto";

@Injectable()
export class SetMapper {
    private readonly LOGGER: Logger = new Logger(SetMapper.name);

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
        this.LOGGER.debug(`entityToDto ${JSON.stringify(set)}`);
        const dto: SetDto = {
            baseSize: set.baseSize,
            block: set.block,
            cards: set.cards ? this.cardMapper.entitiesToDtos(set.cards) : [],
            code: set.code,
            keyruneCode: set.keyruneCode.toLowerCase(),
            name: set.name,
            parentCode: set.parentCode,
            releaseDate: set.releaseDate,
            type: set.type,
            url: this.buildSetUrl(set.code),
        };
        return dto;
    }

    entitiesToDtos(sets: Set[]): SetDto[] {
        return sets.map(s => this.entityToDto(s));
    }

    private buildSetUrl(code: string): string {
        return "sets/" + code.toLowerCase();
    }
}
