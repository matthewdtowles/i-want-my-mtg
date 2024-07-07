import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { CardSet } from 'src/data-ingestion/models/cardSet.model';
import { Set } from 'src/data-ingestion/models/set.model';
import { SetList } from 'src/data-ingestion/models/setList.model';
import { SetResponse } from './set.response.model';
import { CardResponse } from 'src/card/card.response.model';
import { ISetService } from 'src/api/set-service.interface';

@Injectable()
export class SetService implements ISetService {

    private readonly CARD_DATA_API_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_API_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';

    async findAll(): Promise<SetList[]> {
        const resp: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + this.SET_LIST_PATH);
        const setList: SetList[] = resp.data.data;
        setList.forEach(s => s.keyruneCode = s.keyruneCode.toLowerCase());
        return resp.data.data;
    }

    async findByCode(setCode: string): Promise<SetResponse> {
        console.log(`setsService requestSet called: ${this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT}`);
        const response: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        return this.mapSetResponse(response.data.data);
    }

    private mapSetResponse(set: Set): SetResponse {
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

    private mapCardResponses(cards: CardSet[]): CardResponse[] {
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

    async requestSet(setCode: string): Promise<CardSet[]> {
        console.log(`setsService requestSet called: ${this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT}`);
        const response: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        return response.data.data.cards;
    }


    // TODO: separate into:
    // fetch from rest api method to get all set data from CARD_DATA_API
    // get from database
    // process data from api or db based on what we want to be returned
    // public method that will call the above: db first, if nothing, fetch from restful API
}
