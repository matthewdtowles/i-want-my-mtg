import { Injectable } from '@nestjs/common';
import { CardSet } from './dto/cardSet.dto';
import { SetDto } from './dto/set.dto';
import { SetList } from './dto/setList.dto';
import { Set } from 'src/core/set/set.entity';
import { Card } from 'src/core/card/card.entity';

@Injectable()
export class MtgJsonMapperService {

    private readonly SCRYFALL_CARD_IMAGE_URL: string = 'https://cards.scryfall.io/';
    private readonly SCRYFALL_CARD_IMAGE_FORMATS: string[] = ['small', 'normal', 'large', 'art_crop'];
    private readonly SCRYFALL_CARD_IMAGE_SIDES: string[] = ['front', 'back'];
    private readonly GATHERER_CARD_IMAGE_URL: string = 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&multiverseid=';

    mapSetMetaToSet(setMeta: SetDto | SetList): Set {
        const set: Set = new Set();
        set.baseSize = setMeta.baseSetSize;
        set.block = setMeta.block;
        set.cards = [];
        set.keyruneCode = setMeta.keyruneCode.toLowerCase();
        set.name = setMeta.name;
        set.releaseDate = setMeta.releaseDate;
        set.setCode = setMeta.code;
        set.type = setMeta.type;
        return set;
    }

    mapSetCardsToCards(setCards: CardSet[]): Card[] {
        const cards: Card[] = [];
        setCards.forEach(c => {
            cards.push(this.mapSetCardToCard(c));
        });
        return cards;
    }

    mapSetMetaListToSets(setLists: SetList[]): Set[] {
        const sets: Set[] = [];
        setLists.forEach(s => {
            sets.push(this.mapSetMetaToSet(s));
        })
        return sets;
    }

    private mapSetCardToCard(setCard: CardSet): Card {
        const card: Card = new Card();
        card.imgSrc = this.buildCardImgSrc(setCard);
        card.isReserved = setCard.isReserved;
        card.manaCost = setCard.manaCost;
        card.name = setCard.name;
        card.number = setCard.number;
        card.originalText = setCard.originalText;
        card.rarity = setCard.rarity;
        card.url = this.buildCardUrl(setCard);
        card.uuid = setCard.uuid;
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
