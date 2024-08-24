import { Injectable } from '@nestjs/common';
import { CreateCardDto } from 'src/core/card/dto/create-card.dto';
import { CreateSetDto } from 'src/core/set/dto/create-set.dto';
import { IngestionServicePort } from '../../core/ingestion/ingestion.service.port';
import { SetDto } from './dto/set.dto';
import { SetList } from './dto/setList.dto';
import { MtgJsonApiClient } from './mtgjson-api.client';
import { MtgJsonMapperService } from './mtgjson-mapper.service';


@Injectable()
export class MtgJsonIngestionService implements IngestionServicePort {

    constructor(
        private readonly apiClient: MtgJsonApiClient,
        private readonly dataMapper: MtgJsonMapperService,
    ) { }

    async fetchAllSetsMeta(): Promise<CreateSetDto[]> {
        const setList: SetList[] = await this.apiClient.fetchSetList();
        return this.dataMapper.toCreateSetDtos(setList);
    } 

    async fetchSetByCode(code: string): Promise<CreateSetDto> {
        const set: SetDto = await this.apiClient.fetchSet(code);
        return this.dataMapper.toCreateSetDto(set);
    }

    async fetchSetCards(code: string): Promise<CreateCardDto[]> {
        const setDto: SetDto = await this.apiClient.fetchSet(code);
        return this.dataMapper.toCreateCardDtos(setDto.cards);
    }
}