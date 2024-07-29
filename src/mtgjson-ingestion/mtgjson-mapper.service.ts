import { Injectable } from '@nestjs/common';
import { CardSet } from './dtos/cardSet.model';
import { SetDto } from './dtos/set.dto';
import { SetList } from './dtos/setList.model';
import { Set } from 'src/core/set/set.entity';
import { Card } from 'src/core/card/card.entity';

@Injectable()
export class MtgJsonMapperService {

    private readonly SCRYFALL_CARD_IMAGE_URL: string = 'https://cards.scryfall.io/';
    private readonly SCRYFALL_CARD_IMAGE_FORMATS: string[] = ['small', 'normal', 'large', 'art_crop'];
    private readonly SCRYFALL_CARD_IMAGE_SIDES: string[] = ['front', 'back'];
    private readonly GATHERER_CARD_IMAGE_URL: string = 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=';

    /**
     * Maps given Set to a CreateSetDto
     * Metadata of Set; no cards
     * 
     * @param setDto
     * @returns 
     */
    mapCreateSetDto(setDto: SetDto | SetList): Set {
        const set: Set = new Set();
        set.baseSize = setDto.baseSetSize;
        set.block = setDto.block;
        set.setCode = setDto.code.toUpperCase();
        set.keyruneCode = setDto.keyruneCode.toLowerCase();
        set.name = setDto.name;
        // set.parentCode = setDto.parentCode;
        set.releaseDate = setDto.releaseDate;
        set.type = setDto.type;
        // set.url = this.buildSetUrl(setDto.code);
        return set;
    }

    /**
     * Maps given list of CardSet to CreateCardDto
     * 
     * @param cards
     * @returns 
     */
    mapCreateCardDtos(cards: CardSet[]): Card[] {
        const cardDtos: Card[] = [];
        cards.forEach(c => {
            cardDtos.push(this.mapCreateCardDto(c));
        });
        return cardDtos;
    }

    mapCreateSetDtos(setLists: SetList[]): Set[] {
        const setDtos: Set[] = [];
        setLists.forEach(s => {
            setDtos.push(this.mapCreateSetDto(s));
        })
        return setDtos;
    }

    private mapCreateCardDto(cardDto: CardSet): Card {
        const card: Card = new Card();
        card.imgSrc = this.buildCardImgSrc(cardDto);
        card.manaCost = cardDto.manaCost;
        card.name = cardDto.name;
        // card.notes = this.getNotes(cardDto);
        card.number = cardDto.number;
        // card.price = this.getPrice(cardDto);
        card.rarity = cardDto.rarity;
        // card.setCode = cardDto.setCode;
        // card.totalOwned = this.getTotalOwned(cardDto);
        card.url = this.buildCardUrl(cardDto);
        return card;
    }

    private buildCardUrl(card: CardSet): string {
        return this.buildSetUrl(card.setCode) + '/' + card.number;
    }

    private buildCardImgSrc(card: CardSet): string {
        return this.buildScryfallImgPath(card);
    }

    private buildScryfallImgPath(card: CardSet): string {
        // TODO: handle NPE
        const scryfallId: string = card.identifiers.scryfallId;
        return this.SCRYFALL_CARD_IMAGE_URL + 'normal/front/' + scryfallId.charAt(0) + '/' 
            + scryfallId.charAt(1) + '/' + scryfallId + '.jpg';
    }

    private buildMultiverseImgPath(card: CardSet): string {
        // TODO: handle NPE
        return this.GATHERER_CARD_IMAGE_URL + card.identifiers.multiverseId;
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
