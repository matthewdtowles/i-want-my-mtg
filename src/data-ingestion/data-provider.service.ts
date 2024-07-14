import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { SetResponse } from 'src/set/set.response.model';
import { SetList } from './models/setList.model';
import { CardSet } from './models/cardSet.model';

@Injectable()
export class DataProviderService {
    private readonly CARD_DATA_API_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_API_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';
    private readonly CARD_IMAGE_URL: string = 'https://cards.scryfall.io/';
    private readonly CARD_IMAGE_FORMATS: string[] = [ "small", "normal", "large", "png", "art_crop" ];
    private readonly CARD_IMAGE_SIDES: string[] = [ "front", "back" ];

    // https://cards.scryfall.io/{{img.type}}/{{img.face}}/{{img.dir1}}/{{img.dir2}}/{{scryfallId}}.jpg

    async findAll(): Promise<SetList[]> {
        const resp: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + this.SET_LIST_PATH);
        const setList: SetList[] = resp.data.data;
        setList.forEach(s => s.keyruneCode = s.keyruneCode.toLowerCase());
        return resp.data.data;
    }

    async findByCode(setCode: string): Promise<SetResponse> {
        console.log(`setsService requestSet called: ${this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT}`);
        const response: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        return response.data.data;
    }

    async requestSet(setCode: string): Promise<CardSet[]> {
        console.log(`setsService requestSet called: ${this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT}`);
        const response: AxiosResponse = await axios.get(this.CARD_DATA_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        return response.data.data.cards;
    }
}
