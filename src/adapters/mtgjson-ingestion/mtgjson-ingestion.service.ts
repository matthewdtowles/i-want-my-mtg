import { Injectable, Logger } from "@nestjs/common";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { PricePoints } from "src/adapters/mtgjson-ingestion/dto/pricePoints.dto";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { IngestionServicePort } from "src/core/ingestion/api/ingestion.service.port";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { Provider } from "src/core/price/api/provider.enum";
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

    async fetchSetCards(code: string): Promise<CreateCardDto[]> {
        const setDto: SetDto = await this.apiClient.fetchSet(code);
        return this.dataMapper.toCreateCardDtos(setDto.cards);
    }

    async *fetchTodayPrices(): AsyncGenerator<CreatePriceDto> {
        this.LOGGER.debug(`Fetching today prices`);
        const priceStream: Readable = await this.apiClient.fetchTodayPricesStream();
        for await (const { key: cardUuid, value: priceFormats } of priceStream) {
            this.LOGGER.debug(`Processing cardUuid: ${cardUuid}, priceFormats: ${JSON.stringify(priceFormats)}`);
            const paperPrices: Record<string, PriceList> = priceFormats.paper;
            if (!paperPrices) continue;
            for (const [provider, priceList] of Object.entries(paperPrices)) {
                if (!priceList || "USD" !== priceList.currency) continue;
                const pricePoints: PricePoints = priceList.retail;
                if (!pricePoints) continue;
                const allDates = new Set([
                    ...Object.keys(pricePoints.foil || {}),
                    ...Object.keys(pricePoints.normal || {}),
                ]);
                for (const dateStr of allDates) {
                    const priceDto: CreatePriceDto = {
                        cardUuid,
                        provider: provider as Provider,
                        date: new Date(dateStr),
                        foil: pricePoints.foil?.[dateStr] ?? null,
                        normal: pricePoints.normal?.[dateStr] ?? null,
                    };
                    yield priceDto;
                }
            }
        }
    }
}