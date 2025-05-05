import { Injectable, Logger } from "@nestjs/common";
import { PriceList } from "src/adapters/mtgjson-ingestion/dto/priceList.dto";
import { PricePoints } from "src/adapters/mtgjson-ingestion/dto/pricePoints.dto";
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

    async fetchSetCards(code: string): Promise<CreateCardDto[]> {
        const setDto: SetDto = await this.apiClient.fetchSet(code);
        return this.dataMapper.toCreateCardDtos(setDto.cards);
    }

    // FIXME: fix below methods- returning undefined in spec.
    async *fetchTodayPrices(): AsyncGenerator<CreatePriceDto> {
        this.LOGGER.debug(`Fetching today prices`);
        const priceStream: Readable = await this.apiClient.fetchTodayPricesStream();
        for await (const { key: cardUuid, value: priceFormats } of priceStream) {
            const paperPrices: Record<string, PriceList> = priceFormats.paper;
            if (!paperPrices) continue;
            const priceDto: CreatePriceDto = this.toCreatePriceDto(cardUuid, paperPrices);
            yield priceDto;
        }
    }

    private toCreatePriceDto(cardUuid: string, paperPrices: Record<string, PriceList>): CreatePriceDto {
        const extractedPrices: ExtractedPricesDto = this.extractPrices(paperPrices);
        const foilPrice: number = this.determinePrice(extractedPrices.foil);
        const normalPrice: number = this.determinePrice(extractedPrices.normal);
        const dateStr: string = this.extractDate(paperPrices);
        let priceDto: CreatePriceDto;
        if (foilPrice || normalPrice) {
            priceDto = {
                cardUuid,
                date: new Date(dateStr),
                foil: foilPrice,
                normal: normalPrice,
            };
        }
        return priceDto;
    }

    private extractDate(paperPrices: Record<string, PriceList>): string {
        for (const [_, priceList] of Object.entries(paperPrices)) {
            if (!priceList || !priceList.retail) continue;
            const pricePoints: PricePoints = priceList.retail;
            let dateStr: string = Object.keys(pricePoints.normal || {})[0];
            if (!dateStr) {
                dateStr = Object.keys(pricePoints.foil || {})[0];
            }
            if (dateStr) {
                return dateStr;
            }
        }
        throw new Error("No date found in paper prices");
    }

    private extractPrices(paperPrices: Record<string, PriceList>): ExtractedPricesDto{
        const foilPrices: number[] = [];
        const normalPrices: number[] = [];
        for (const [_, priceList] of Object.entries(paperPrices)) {
            if (!priceList || !priceList.retail) continue;
            if (priceList.currency !== "USD") continue;
            const pricePoints: PricePoints = priceList.retail;
            if (pricePoints.foil) {
                for (const [_, foilPrice] of Object.entries(pricePoints.foil)) {
                    foilPrices.push(foilPrice);
                }
            }
            if (pricePoints.normal) {
                for (const [_, normalPrice] of Object.entries(pricePoints.normal)) {
                    normalPrices.push(normalPrice);
                }
            }
        }
        return new ExtractedPricesDto(foilPrices, normalPrices);
    }

    private determinePrice(prices: number[]): number {
        const total: number = prices.reduce((acc, price) => acc + price, 0);
        const avg: number = total / prices.length;
        return Math.ceil(avg * 100) / 100; // Round to hundredths
    }
}

class ExtractedPricesDto {
    foil: number[];
    normal: number[];

    constructor(foil: number[], normal: number[]) {
        this.foil = foil;
        this.normal = normal;
    }
}