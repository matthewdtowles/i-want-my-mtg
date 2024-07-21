import { Injectable } from '@nestjs/common';
import { CreateSetDto } from 'src/set/dto/create-set.dto';
import { DataProviderService } from './data-provider.service';
import { SetList } from './models/setList.model';
import { Set } from './models/set.model';
import { DataMapperService } from './data-mapper.service';
import { CreateCardDto } from 'src/core/card/dto/create-card.dto';


@Injectable()
export class DataIngestionService {

    constructor(private readonly dataProvider: DataProviderService,
        private readonly dataMapper: DataMapperService
    ) {}

    async fetchAllSets(): Promise<CreateSetDto[]> {
        const setList: SetList[] = await this.dataProvider.requestSetList();
        return this.dataMapper.mapCreateSetDtos(setList);
    }

    async fetchSetCards(code: string): Promise<CreateCardDto[]> {
        const set: Set = await this.dataProvider.requestSet(code);
        return this.dataMapper.mapCreateCardDtos(set.cards);
    }

}
