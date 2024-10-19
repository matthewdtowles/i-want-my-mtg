import { Inject, Injectable, Logger } from "@nestjs/common";
import { Set } from "src/core/set/set.entity";
import { CardMapper } from "../card/card.mapper";
import { CreateSetDto } from "./dto/create-set.dto";
import { SetDto } from "./dto/set.dto";
import { UpdateSetDto } from "./dto/update-set.dto";

@Injectable()
export class SetMapper {
  private readonly LOGGER: Logger = new Logger(SetMapper.name);

  constructor(@Inject(CardMapper) private readonly cardMapper: CardMapper) { }

  dtosToEntities(setDtos: CreateSetDto[] | UpdateSetDto[]): Set[] {
    const sets: Set[] = [];
    setDtos.forEach((s) => {
      sets.push(this.dtoToEntity(s));
    });
    return sets;
  }

  dtoToEntity(createSetDto: CreateSetDto): Set {
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

  entityToDto(set: Set): SetDto {
    const dto: SetDto = {
      baseSize: set.baseSize,
      block: set.block,
      cards: this.cardMapper.entitiesToDtos(set.cards),
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

  /**
   * Maps array of Set entities meta-data to array of GetSetDtos
   *
   * @param sets
   * @returns
   */
  entitiesToDtos(sets: Set[]): SetDto[] {
    const setDtos = [];
    sets.forEach((s) => {
      setDtos.push(this.entityToDto(s));
    });
    return setDtos;
  }

  private buildSetUrl(code: string): string {
    return "sets/" + code.toLowerCase();
  }
}
