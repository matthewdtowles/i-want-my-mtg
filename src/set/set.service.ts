import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { CardSet } from 'src/models/cardSet.model';
import { Set } from 'src/models/set.model';
import { SetList } from 'src/models/setList.model';

@Injectable()
export class SetService {
    private readonly CARD_DATA_API_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_API_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';

    async requestSetList(): Promise<SetList[]> {
        const resp: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + this.SET_LIST_PATH);
        // TODO: handle/process response?
        const setList: SetList[] = resp.data.data;
        setList.forEach(s => s.keyruneCode = s.keyruneCode.toLowerCase());
        return resp.data.data;
    }

    async findByCode(setCode: string): Promise<object> {
        console.log(`setsService requestSet called: ${this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT}`);
        const response: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        // TODO: handle/process response?
        response.data.data.keyruneCode = response.data.data.keyruneCode.toLowerCase();
        // TODO: in processing -> convert mana cost to array for templating 
        return response.data.data;
    }

    async requestSet(setCode: string): Promise<CardSet[]> {
        console.log(`setsService requestSet called: ${this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT}`);
        const response: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        // TODO: handle/process response?
        return response.data.data.cards;
    }


    // TODO: separate into:
    // fetch from rest api method to get all set data from CARD_DATA_API
    // get from database
    // process data from api or db based on what we want to be returned
    // public method that will call the above: db first, if nothing, fetch from restful API
}
