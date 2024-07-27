import { Injectable } from '@nestjs/common';
import { CreateSetDto } from '../http/set/create-set.dto';
import { SetList } from './models/setList.model';
import { Set } from './models/set.model';
import { MtgJsonMapperService } from './mtgjson-mapper.service';
import { CreateCardDto } from '../http/card/create-card.dto';
import { SetDataIngestionPort } from '../core/set/ports/set-data.ingestion.port';
import { CardDataIngestionPort } from '../core/card/ports/card-data.ingestion.port';
import axios, { AxiosResponse } from 'axios';


@Injectable()
export class MtgJsonIngestionService implements SetDataIngestionPort, CardDataIngestionPort {
    private readonly CARD_PROVIDER_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_PROVIDER_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';
    
    constructor(private readonly dataMapper: MtgJsonMapperService) {}

    async fetchAllSets(): Promise<CreateSetDto[]> {
        const setList: SetList[] = await this.requestSetList();
        return this.dataMapper.mapCreateSetDtos(setList);
    }

    async fetchSetCards(code: string): Promise<CreateCardDto[]> {
        const set: Set = await this.requestSet(code);
        return this.dataMapper.mapCreateCardDtos(set.cards);
    }

    /**
     * Return List of metadata for every Set from Set provider
     * 
     * @returns 
     */
    async requestSetList(): Promise<SetList[]> {
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
    async requestSet(setCode: string): Promise<Set> {
        const url: string = this.CARD_PROVIDER_URL + setCode.toUpperCase() + this.CARD_PROVIDER_FILE_EXT;
        console.log(`Data provider calling ${url}`);
        const response: AxiosResponse = await axios.get(url);
        return response.data.data;
    }
}
