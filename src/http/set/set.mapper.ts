import { Set } from "src/core/set/entities/set.entity";
import { CreateSetDto } from "./create-set.dto";
import { GetSetDto } from "./get-set.dto";
import { GetCardDto } from "../card/get-card.dto";
import { Card } from "src/core/card/entities/card.entity";

export class SetMapper {

    dtoToEntity(createSetDto: CreateSetDto): Set {
        const set = new Set();
        set.name = createSetDto.name;
        return set;
    }

    entityToDto(set: Set): GetSetDto {
        const dto: GetSetDto = new GetSetDto();
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
    entitiesToDtos(sets: Set[]): GetSetDto[] {
        const setDtos = [];
        sets.forEach(s => {
            const dto: GetSetDto = new GetSetDto();
            dto.block = s.block;
            dto.code = s.setCode.toUpperCase();
            dto.keyruneCode = s.keyruneCode.toLowerCase();
            dto.name = s.name;
            dto.releaseDate = s.releaseDate;
            dto.url = this.buildSetUrl(s.setCode);
        });
        return setDtos;
    }


    private mapCardResponses(cards: Card[]): GetCardDto[] {
        const cardResponses: GetCardDto[] = [];
        cards.forEach(c => {
            const dto: GetCardDto = new GetCardDto();
            // TODO: manacost as []?
            // dto.manaCost = this.buildManaCost(c.manaCost);
            dto.name = c.name;
            // cr.notes = this.getNotes(c);
            dto.number = c.number;
            // cr.price = this.getPrice(c);
            dto.rarity = c.rarity;
            // cr.setCode = c.setCode;
            // cr.totalOwned = this.getTotalOwned(c);
            // cr.url = this.buildCardUrl(c);
            cardResponses.push(dto);
        });
        return cardResponses;
    }

    private buildManaCost(manaCost: string): string[] {
        return manaCost != null ? manaCost
            .toLowerCase()
            .replaceAll('/', '')
            .replace('{', '')
            .replaceAll('}', '')
            .split('{')
            : null;
    }

    private buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }
}