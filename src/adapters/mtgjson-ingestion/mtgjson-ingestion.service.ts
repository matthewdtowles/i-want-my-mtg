import { Injectable, Logger } from "@nestjs/common";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { IngestionServicePort } from "src/core/ingestion/api/ingestion.service.port";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { Readable } from "stream";
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

    async *fetchSetCards(code: string): AsyncGenerator<CreateCardDto> {
        this.LOGGER.debug(`Fetching cards for set ${code}`);
        const cardStream: Readable = await this.apiClient.fetchSetCardsStream(code);
        for await (const setCard of cardStream) {
            const cardDto: CreateCardDto = this.dataMapper.toCreateCardDto(setCard);
            if (cardDto) yield cardDto;
        }
    }

    async *fetchTodayPrices(): AsyncGenerator<CreatePriceDto> {
        this.LOGGER.debug(`Fetching today prices`);
        const priceStream: Readable = await this.apiClient.fetchTodayPricesStream();
        for await (const { key: cardUuid, value: priceFormats } of priceStream) {
            const paperPrices: Record<string, PriceList> = priceFormats.paper;
            if (!paperPrices) continue;
            const priceDto: CreatePriceDto = this.dataMapper.toCreatePriceDto(cardUuid, paperPrices);
            if (priceDto) yield priceDto;
        }
    }
}