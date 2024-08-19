import { Injectable } from '@nestjs/common';
import { SetList } from './dto/setList.dto';
import { SetDto } from './dto/set.dto';
import { MtgJsonMapperService } from './mtgjson-mapper.service';
import { IngestionServicePort } from '../../core/ingestion/ingestion.service.port';
import { Set } from 'src/core/set/set.entity';
import { Card } from 'src/core/card/card.entity';
import { MtgJsonApiClient } from './mtgjson-api.client';


@Injectable()
export class MtgJsonIngestionService implements IngestionServicePort {

    constructor(
        private readonly apiClient: MtgJsonApiClient,
        private readonly dataMapper: MtgJsonMapperService,
    ) { }

    async fetchAllSetsMeta(): Promise<Set[]> {
        const setList: SetList[] = await this.apiClient.fetchSetList();
        return this.dataMapper.mapSetMetaListToSets(setList);
    } 

    async fetchSetByCode(code: string): Promise<Set> {
        throw new Error('Method not implemented.');
    }

    async fetchSetCards(code: string): Promise<Card[]> {
        const setDto: SetDto = await this.apiClient.fetchSet(code);
        return this.dataMapper.mapSetCardsToCards(setDto.cards);
    }
}
