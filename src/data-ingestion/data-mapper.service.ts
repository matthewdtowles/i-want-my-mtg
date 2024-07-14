import { Injectable } from '@nestjs/common';
import { CardResponse } from 'src/card/card.response.model';
import { SetResponse } from 'src/set/set.response.model';
import { CardSet } from './models/cardSet.model';
import { Set } from './models/set.model';

@Injectable()
export class DataMapperService {
    mapSetResponse(set: Set): SetResponse {
        const setResponse: SetResponse = new SetResponse();
        setResponse.block = set.block;
        setResponse.cards = this.mapCardResponses(set.cards);
        setResponse.code = set.code.toUpperCase();
        setResponse.keyruneCode = set.keyruneCode.toLowerCase();
        setResponse.name = set.name;
        setResponse.releaseDate = set.releaseDate; // TODO: convert to release date to show?
        setResponse.url = this.buildSetUrl(set.code);
        return setResponse;
    }

    mapCardResponses(cards: CardSet[]): CardResponse[] {
        const cardResponses: CardResponse[] = [];
        cards.forEach(c => {
            const cr: CardResponse = new CardResponse();
            cr.manaCost = this.buildManaCost(c.manaCost);
            cr.name = c.name;
            cr.notes = this.getNotes(c);
            cr.number = c.number;
            cr.price = this.getPrice(c);
            cr.rarity = c.rarity;
            cr.setCode = c.setCode;
            cr.totalOwned = this.getTotalOwned(c);
            cr.url = this.buildCardUrl(c);
            cardResponses.push(cr);
        });
        return cardResponses;
    }

    private buildCardUrl(card: CardSet): string {
        return "";
    }

    private getTotalOwned(card: CardSet) {
        return 0;
    }

    private getNotes(card: CardSet): string[] {
        return [];
    }

    private getPrice(card: CardSet): number {
        return 0.00;
    }

    private buildManaCost(manaCost: string): string[] {
        return manaCost != null ? manaCost
                .toLowerCase()
                .replaceAll('/', '')
                .replace('{', '')
                .replaceAll('}', '')
                .split('{') 
                : null; // TODO: is null safe to return?
    }

    private buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }

}
