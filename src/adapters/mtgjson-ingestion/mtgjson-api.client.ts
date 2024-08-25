import { Injectable, Logger } from "@nestjs/common"
import axios, { AxiosResponse } from "axios";
import { SetDto } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";

@Injectable()
export class MtgJsonApiClient {
    private readonly LOGGER: Logger = new Logger(MtgJsonApiClient.name);
    private readonly CARD_PROVIDER_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_PROVIDER_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';

    /**
     * Return List of metadata for every Set from Set provider
     * 
     * @returns array of SetLists from MTG JSON
     */
    async fetchSetList(): Promise<SetList[]> {
        const url: string = this.CARD_PROVIDER_URL + this.SET_LIST_PATH;
        this.LOGGER.log(`${MtgJsonApiClient.name} calling ${url}`);
        const response: AxiosResponse = await axios.get(url);
        let setList: SetList[] = [];
        if (response && response.data && Array.isArray(response.data.data)
            && response.data.data.every((item: any) => item instanceof SetList)) {
            setList = response.data.data;
        } else {
            this.LOGGER.error(`Invalid response for fetchSetList: ${response}`);
        }
        return setList;
    }

    /**
      * Returns Set object for given code
      * Includes all CardSet objects in the Set
      *  
      * @param setCode
      * @returns a SetDto from MTG JSON
      */
    async fetchSet(setCode: string): Promise<SetDto> {
        const url: string = this.CARD_PROVIDER_URL + setCode.toUpperCase() + this.CARD_PROVIDER_FILE_EXT;
        this.LOGGER.log(`${MtgJsonApiClient.name} calling ${url}`);
        const response: AxiosResponse = await axios.get(url);
        let set: SetDto = new SetDto();
        if (response && response.data && response.data.data instanceof Set) {
            set = response.data.data;
        } else {
            this.LOGGER.error(`Invalid response for fetchSet: ${response}`);
        }
        return set;
    }
}

