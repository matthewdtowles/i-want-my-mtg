import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { PriceServicePort } from "src/core/price/api/price.service.port";
import { CardDto } from "../card/api/card.dto";
import { CardServicePort } from "../card/api/card.service.port";
import { CreateCardDto } from "../card/api/create-card.dto";
import { CreateSetDto, SetDto } from "../set/api/set.dto";
import { SetServicePort } from "../set/api/set.service.port";
import { IngestionOrchestratorPort } from "./api/ingestion.orchestrator.port";
import { IngestionServicePort } from "./api/ingestion.service.port";
import { Timing } from "src/shared/decorators/timing.decorator";

@Injectable()
export class IngestionOrchestrator implements IngestionOrchestratorPort {
    private readonly LOGGER: Logger = new Logger(IngestionOrchestrator.name);
    private readonly BUF_SIZE: number = 100;

    constructor(
        @Inject(IngestionServicePort) private readonly ingestionService: IngestionServicePort,
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
        @Inject(SetServicePort) private readonly setService: SetServicePort,
        @Inject(PriceServicePort) private readonly priceService: PriceServicePort,
    ) {
        this.LOGGER.debug("Initialized");
    }

    @Timing()
    async ingestAllSetMeta(): Promise<void> {
        this.LOGGER.debug(`ingest meta data for all sets`);
        const setMeta: CreateSetDto[] = await this.ingestionService.fetchAllSetsMeta() ?? [];
        const savedSets: SetDto[] = await this.setService.save(setMeta);
        this.LOGGER.log(`Saved Sets size: ${savedSets.length}`);
    }

    @Timing()
    async ingestAllSetCards(): Promise<void> {
        this.LOGGER.debug(`ingest all cards for all sets`);
        const missedSets: string[] = [];
        const sets: SetDto[] = await this.setService.findAll();
        for (let i = 0; i < sets.length; i++) {
            try {
                await this.ingestSetCards(sets[i].code);
            } catch (error) {
                this.LOGGER.error(`Failed to ingest set cards for set ${sets[i].code}: ${error}`);
                missedSets.push(sets[i].code);
            }
        }
        this.LOGGER.log(`Missed Sets: ${JSON.stringify(missedSets)}`);
    }

    @Timing()
    async ingestSetCards(code: string): Promise<void> {
        this.LOGGER.debug(`ingest set cards for set code: ${code}`);
        let totalSaved: number = 0;
        const buffer: CreateCardDto[] = [];
        for await (const cardDto of this.ingestionService.fetchSetCards(code)) {
            buffer.push(cardDto);
            if (buffer.length >= this.BUF_SIZE) {
                totalSaved += buffer.length;
                await this.flushBuffer(buffer, this.cardService.save.bind(this.cardService));
            }
        }
        if (buffer.length > 0) {
            totalSaved += buffer.length;
            await this.flushBuffer(buffer, this.cardService.save.bind(this.cardService));
        }
        this.LOGGER.log(`Saved ${totalSaved} cards in set ${code}`);
    }

    @Timing()
    async ingestTodayPrices(): Promise<void> {
        this.LOGGER.debug(`Ingest prices for today.`);
        const buffer: CreatePriceDto[] = [];
        for await (const priceDto of this.ingestionService.fetchTodayPrices()) {
            buffer.push(priceDto);
            if (buffer.length >= this.BUF_SIZE) {
                await this.flushPriceBuffer(buffer);
            }
        }
        if (buffer.length > 0) {
            await this.flushPriceBuffer(buffer);
        }
        this.LOGGER.log(`Price ingestion completed.`);
    }

    // TODO: test ingestion without using fillMissingPrices since we should not need it since 
    // moving to one-to-many relationship
    @Timing()
    async fillMissingPrices(): Promise<void> {
        this.LOGGER.debug(`Fill missing prices for today.`);
        const date: string = this.todayDateStr();
        await this.priceService.fillMissingPrices(date);
        this.LOGGER.log(`Missing prices filled for date: ${date}`);
    }

    private async flushBuffer<T>(buffer: T[], saveMethod: (buffer: T[]) => Promise<void>): Promise<void> {
        try {
            await saveMethod(buffer);
        } catch (error) {
            this.LOGGER.error(`Failed to save buffer: ${error}`);
        } finally {
            // Clear the buffer after processing
            buffer.length = 0;
        }
    }

    private async flushPriceBuffer(buffer: CreatePriceDto[]): Promise<void> {
        try {
            await this.priceService.save(buffer);
        } catch (error) {
            this.LOGGER.error(`Failed to save buffer: ${error}`);
        } finally {
            // Clear the buffer after processing
            buffer.length = 0;
        }
    }

    // private async flushCardBuffer(buffer: CreateCardDto[]): Promise<void> {
    //     try {
    //         await this.cardService.save(buffer);
    //     } catch (error) {
    //         this.LOGGER.error(`Failed to save buffer: ${error}`);
    //     } finally {
    //         // Clear the buffer after processing
    //         buffer.length = 0;
    //     }
    // }

    private todayDateStr(): string {
        return new Date().toISOString().split("T")[0];
    }
}
