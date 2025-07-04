import { Injectable, Logger } from "@nestjs/common";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { Card } from "src/core/card/card.entity";
import { IngestionServicePort } from "src/core/ingestion/ingestion.service.port";
import { Price } from "src/core/price/price.entity";
import { Set } from "src/core/set/set.entity";
import { Readable } from "stream";
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

    async fetchAllSetsMeta(): Promise<Set[]> {
        const setList: SetList[] = await this.apiClient.fetchSetList();
        return this.dataMapper.mapCoreSets(setList);
    }

    async *fetchSetCards(code: string): AsyncGenerator<Card> {
        this.LOGGER.debug(`Fetching cards for set ${code}`);
        const cardStream: Readable = await this.apiClient.fetchSetCardsStream(code);
        for await (const setCard of cardStream) {
            const card: Card = this.dataMapper.mapCoreCard(setCard);
            if (card) yield card;
        }
    }

    async *fetchTodayPrices(): AsyncGenerator<Price> {
        this.LOGGER.debug(`Fetching today prices`);
        const priceStream: Readable = await this.apiClient.fetchTodayPricesStream();
        for await (const { key: cardUuid, value: priceFormats } of priceStream) {
            const paperPrices: Record<string, PriceList> = priceFormats.paper;
            if (!paperPrices) continue;
            const priceDto: Price = this.dataMapper.mapCorePrice(cardUuid, paperPrices);
            if (priceDto) yield priceDto;
        }
    }
}