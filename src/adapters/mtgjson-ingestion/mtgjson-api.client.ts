import { Injectable } from "@nestjs/common"
import axios, { AxiosResponse } from "axios";
import { SetDto } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";

@Injectable()
export class MtgJsonApiClient {
    private readonly CARD_PROVIDER_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_PROVIDER_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';

    /**
     * Return List of metadata for every Set from Set provider
     * 
     * @returns 
     */
    async fetchSetList(): Promise<SetList[]> {
        const url: string = this.CARD_PROVIDER_URL + this.SET_LIST_PATH;
        console.log(`Data provider calling ${url}`);
        const response: AxiosResponse = await axios.get(url);
        return response.data.data;
    }

    /**
      * Returns Set object for given code
      * Includes all CardSet objects in the Set
      *  
      * @param setCode
      * @returns 
      */
    async fetchSet(setCode: string): Promise<SetDto> {
        const url: string = this.CARD_PROVIDER_URL + setCode.toUpperCase() + this.CARD_PROVIDER_FILE_EXT;
        console.log(`Data provider calling ${url}`);
        const response: AxiosResponse = await axios.get(url);
        return response.data.data;
    }
}    
    
