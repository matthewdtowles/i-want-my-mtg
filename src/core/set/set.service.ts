import { Injectable } from '@nestjs/common';
import { SetResponse } from './set.response.model';
import { CardResponse } from '../card/card.response.model';
import { GetSetDto } from './dto/get-set.dto';
import { GetCardDto } from '../card/dto/get-card.dto';

@Injectable()
export class SetService {

    async findAll(): Promise<GetSetDto[]> {
        return null;
    }

    async findByCode(setCode: string): Promise<SetResponse> {
        return null;
    }

    private mapSetResponse(set: GetSetDto): SetResponse {
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

    private mapCardResponses(cards: GetCardDto[]): CardResponse[] {
        const cardResponses: CardResponse[] = [];
        cards.forEach(c => {
            const cr: CardResponse = new CardResponse();
            cr.manaCost = this.buildManaCost(c.manaCost);
            cr.name = c.name;
            // cr.notes = this.getNotes(c);
            cr.number = c.number;
            // cr.price = this.getPrice(c);
            cr.rarity = c.rarity;
            // cr.setCode = c.setCode;
            // cr.totalOwned = this.getTotalOwned(c);
            // cr.url = this.buildCardUrl(c);
            cardResponses.push(cr);
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
            : null; // TODO: is null safe to return?
    }

    private buildSetUrl(code: string): string {
        return 'sets/' + code.toLowerCase();
    }
}
