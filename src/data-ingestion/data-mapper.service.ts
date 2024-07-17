import { Injectable } from '@nestjs/common';
import { CardSet } from './models/cardSet.model';
import { Set } from './models/set.model';
import { CreateCardDto } from '../card/dto/create-card.dto';
import { CreateSetDto } from '../set/dto/create-set.dto';

@Injectable()
export class DataMapperService {

    /**
     * Maps given Set to a CreateSetDto
     * Metadata of Set; no cards
     * 
     * @param set
     * @returns 
     */
    mapCreateSetDto(set: Set): CreateSetDto {
        const setDto: CreateSetDto = new CreateSetDto();
        setDto.baseSize = set.baseSetSize;
        setDto.block = set.block;
        setDto.code = set.code.toUpperCase();
        // setDto.imgSrc = set.cardsphereSetId()
        setDto.keyruneCode = set.keyruneCode.toLowerCase();
        setDto.name = set.name;
        setDto.parentCode = set.parentCode;
        setDto.releaseDate = set.releaseDate;
        setDto.type = set.type;
        setDto.url = this.buildSetUrl(set.code);
        return setDto;
    }

    /**
     * Maps given list of CardSet to CreateCardDto
     * 
     * @param cards
     * @returns 
     */
    mapCreateCardDtos(cards: CardSet[]): CreateCardDto[] {
        const cardDtos: CreateCardDto[] = [];
        cards.forEach(c => {
            cardDtos.push(this.mapCreateCardDto(c));
        });
        return cardDtos;
    }

    private mapCreateCardDto(card: CardSet): CreateCardDto {
        const dto: CreateCardDto = new CreateCardDto();
        dto.imgSrc = this.buildCardImgSrc(card);
        dto.manaCost = card.manaCost;
        dto.name = card.name;
        dto.notes = this.getNotes(card);
        dto.number = card.number;
        dto.price = this.getPrice(card);
        dto.rarity = card.rarity;
        dto.setCode = card.setCode;
        dto.totalOwned = this.getTotalOwned(card);
        dto.url = this.buildCardUrl(card);
        return dto;
    }

    private buildCardUrl(card: CardSet): string {
        return this.buildSetUrl(card.setCode) + '/' + card.number;
    }

    private buildCardImgSrc(card: CardSet): string {
        return this.buildScryfallImgPath(card);
    }

    private buildScryfallImgPath(card: CardSet): string {
        const scryfallId: string = card.identifiers.scryfallId;
        return scryfallId.charAt(0) + '/' + scryfallId.charAt(1) + '/' + scryfallId;
    }

    private buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }

    private getTotalOwned(card: CardSet) {
        // TODO: impl
        return 0;
    }

    private getNotes(card: CardSet): string[] {
        // TODO: impl
        return [];
    }

    private getPrice(card: CardSet): number {
        // TODO: impl
        return 0.00;
    }

}
