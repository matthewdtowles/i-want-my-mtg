import { Set } from 'src/core/set/set.entity';
import { CreateSetDto } from './dtos/create-set.dto';
import { SetDto } from './dtos/set.dto';
import { CardDto } from '../card/dtos/card.dto';
import { Card } from 'src/core/card/card.entity';

export class SetMapper {

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
            const dto: CardDto = new CardDto();
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