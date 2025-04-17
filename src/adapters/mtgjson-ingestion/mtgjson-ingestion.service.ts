import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import { AllPricesTodayFile } from "src/adapters/mtgjson-ingestion/dto/allPricesTodayFile.dto";
import { PriceFormats } from "src/adapters/mtgjson-ingestion/dto/priceFormats.dto";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { IngestionServicePort } from "src/core/ingestion/api/ingestion.service.port";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { CreateSetDto } from "src/core/set/api/set.dto";
import { Writable } from "stream";
import { parser } from "stream-json";
import { streamObject } from "stream-json/streamers/StreamObject";
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

    async fetchTodayPrices(): Promise<CreatePriceDto[]> {
        this.LOGGER.debug(`Fetching today prices`);
        const todayPrices: AllPricesTodayFile = await this.apiClient.fetchTodayPrices();
        this.LOGGER.log("Validating today prices");
        this.validateAllPricesTodayFile(todayPrices);
        this.LOGGER.log("Validating today prices - done");
        const dataChunks: [string, PriceFormats][][] = this.chunkData(Object.entries(todayPrices.data));
        this.LOGGER.log(`Data chunks size: ${dataChunks.length}`);
        const priceDtos: CreatePriceDto[] = [];
        for (const chunk of dataChunks) {
            const chunkDtos: CreatePriceDto[] = this.dataMapper.toCreatePriceDtos({
                meta: todayPrices.meta,
                data: Object.fromEntries(chunk),
            });
            priceDtos.push(...chunkDtos);
        }
        this.LOGGER.log(`Price DTOs size: ${priceDtos.length}`);

        return priceDtos;
    }

    private validateAllPricesTodayFile(prices: AllPricesTodayFile): void {
        if (!prices) {
            throw new Error("Today prices not found.");
        }
        if (!prices.data) {
            throw new Error("Today prices data not found.");
        }
        if (!prices.meta || !prices.meta.date) {
            throw new Error("Today prices meta data not found.");
        }
    }

    private chunkData<T>(array: T[], chunkSize: number = 100): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    // TODO: ANALYZE & EDIT
    async processPricesFile(filePath: string): Promise<void> {
        const pipeline = fs.createReadStream(filePath)
            .pipe(parser())
            .pipe(streamObject());
        const saveStream = new Writable({
            objectMode: true,
            write: async ({ key, value }, _, callback) => {
                try {
                    if (key === 'meta') {
                        this.LOGGER.debug('Skipping metadata');
                        callback();
                        return;
                    }
                    await this.saveCardPrices(key, value);
                    callback();
                } catch (error) {
                    this.LOGGER.error(`Error processing key ${key}: ${error.message}`);
                    callback(error);
                }
            },
        });
        pipeline.pipe(saveStream);
        return new Promise((resolve, reject) => {
            saveStream.on('finish', () => {
                this.LOGGER.log('Finished processing prices file');
                resolve();
            });

            saveStream.on('error', (error) => {
                this.LOGGER.error(`Error in processing pipeline: ${error.message}`);
                reject(error);
            });
        });
    }

    // TODO: ANALYZE & EDIT - map Prices for ONE card at a time 
    private async saveCardPrices(cardUuid: string, priceFormats: any): Promise<void> {
        if (!priceFormats || !priceFormats.paper) {
            this.LOGGER.warn(`No paper prices for card UUID: ${cardUuid}`);
            return;
        }

        const priceDtos: CreatePriceDto[] = [];
        const dateStr = new Date().toISOString().split('T')[0]; // Example date, replace with actual logic
        const _date = new Date(dateStr);

        Object.entries(priceFormats.paper).forEach(([provider, priceList]) => {
            if (this.hasValidRetail(priceList)) {
                const foilRecord: Record<string, number> = priceList.retail.foil;
                const normalRecord: Record<string, number> = priceList.retail.normal;

                priceDtos.push({
                    cardUuid,
                    foil: this.hasFoilPrice(priceList.retail) ? foilRecord[dateStr] : null,
                    normal: this.hasNormalPrice(priceList.retail) ? normalRecord[dateStr] : null,
                    date: _date,
                    provider: provider as Provider,
                });
            }
        });

        // Save the price DTOs (replace with actual save logic)
        this.LOGGER.log(`Saving ${priceDtos.length} prices for card UUID: ${cardUuid}`);
        // Example: await this.priceService.savePrices(priceDtos);
    }
}
