import { Injectable, Logger } from "@nestjs/common";
import { CreateCardDto } from "src/core/card/api/card.dto";
import { IngestionServicePort } from "src/core/ingestion/api/ingestion.service.port";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { SetDto } from "./dto/set.dto";
import { SetList } from "./dto/setList.dto";
import { MtgJsonApiClient } from "./mtgjson-api.client";
import { MtgJsonIngestionMapper } from "./mtgjson-ingestion.mapper";

@Injectable()
export class MtgJsonIngestionService implements IngestionServicePort {
    private readonly LOGGER = new Logger(MtgJsonIngestionService.name);

    constructor(
        private readonly apiClient: MtgJsonApiClient,
        private readonly dataMapper: MtgJsonIngestionMapper,
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
        this.LOGGER.debug(`fetchSetCards* * * * * * * * * * * * * * * * * * * * * * * * * *`);
        this.LOGGER.debug(`fetchSetCards: ${JSON.stringify(setDto?.cards[0]?.legalities)}`);
        const createCardDtos: CreateCardDto[] = this.dataMapper.toCreateCardDtos(setDto.cards);
        return createCardDtos;
    }
}
