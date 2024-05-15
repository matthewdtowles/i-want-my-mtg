import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { CardSet } from 'src/models/cardSet.model';
import { Set } from 'src/models/set.model';
import { SetList } from 'src/models/setList.model';

@Injectable()
export class SetsService {
    // here for now until we need in more than one place
    // then switch to using ConfigService to handle
    private readonly CARD_API_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_API_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';

    async requestSetList(): Promise<SetList[]> {
        const resp: AxiosResponse = await axios.get(this.CARD_API_URL + this.SET_LIST_PATH);
        // TODO: handle/process response?
        return resp.data.data;
    }

    async requestSet(setCode: string): Promise<CardSet[]> {
        console.log(`setsService requestSet called: ${this.CARD_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT}`);
        const response: AxiosResponse = await axios.get(this.CARD_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        // TODO: handle/process response?
        return response.data.data.cards;
    }
}
