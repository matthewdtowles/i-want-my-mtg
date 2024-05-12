import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { Set } from 'src/models/set.model';
import { SetList } from 'src/models/setList.model';

@Injectable()
export class SetsService {
    // here for now until we need in more than one place
    // then switch to using ConfigService to handle
    private readonly CARD_API_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_API_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = '/SetList.json';

    // TODO: replace <any> when we know the type
    async requestSetList(): Promise<string[]> {
        const resp: AxiosResponse = await axios.get(this.CARD_API_FILE_EXT + this.SET_LIST_PATH);
        const setList: SetList[] = resp.data.data;
        const setNames: string[] = [];
        for (const set of setList) {
            setNames.push(set.name);
        }
        return setNames;
    }

    async requestSet(setCode: string): Promise<Set> {
        const response: AxiosResponse = await axios.get(this.CARD_API_URL + setCode.toUpperCase() + this.CARD_API_FILE_EXT);
        // TODO: handle response.status
        return response.data.data;
    }
}
