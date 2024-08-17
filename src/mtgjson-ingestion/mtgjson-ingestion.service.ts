import { Injectable } from '@nestjs/common';
import { SetList } from './dtos/setList.dto';
import { SetDto } from './dtos/set.dto';
import { MtgJsonMapperService } from './mtgjson-mapper.service';
import { SetDataIngestionPort } from '../core/set/ports/set-data.ingestion.port';
import { CardDataIngestionPort } from '../core/card/ports/card-data.ingestion.port';
import axios, { AxiosResponse } from 'axios';
import { Set } from 'src/core/set/set';
import { Card } from 'src/core/card/card';


@Injectable()
export class MtgJsonIngestionService implements SetDataIngestionPort, CardDataIngestionPort {
    private readonly CARD_PROVIDER_URL: string = 'https://mtgjson.com/api/v5/';
    private readonly CARD_PROVIDER_FILE_EXT: string = '.json';
    private readonly SET_LIST_PATH: string = 'SetList.json';

    constructor(private readonly dataMapper: MtgJsonMapperService) { }

    async fetchAllSetsMeta(): Promise<Set[]> {
        const setList: SetList[] = await this.requestSetList();
        return this.dataMapper.mapSetMetaListToSets(setList);
    }

    async fetchSetByCode(code: string): Promise<Set> {
        throw new Error('Method not implemented.');
    }

    async fetchSetCards(code: string): Promise<Card[]> {
        const setDto: SetDto = await this.requestSet(code);
        return this.dataMapper.mapSetCardsToCards(setDto.cards);
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
    async requestSet(setCode: string): Promise<SetDto> {
        const url: string = this.CARD_PROVIDER_URL + setCode.toUpperCase() + this.CARD_PROVIDER_FILE_EXT;
        console.log(`Data provider calling ${url}`);
        const response: AxiosResponse = await axios.get(url);
        return response.data.data;
    }
}
