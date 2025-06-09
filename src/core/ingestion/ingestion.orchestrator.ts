import { Inject, Injectable, Logger } from "@nestjs/common";
import { Card, CardService } from "src/core/card";
import { IngestionServicePort } from "src/core/ingestion";
import { Price, PriceService } from "src/core/price";
import { CreateSetDto, Set, SetService } from "src/core/set";
import { Timing } from "src/shared/decorators/timing.decorator";

@Injectable()
export class IngestionOrchestrator {
    private readonly LOGGER: Logger = new Logger(IngestionOrchestrator.name);
    private readonly PRICE_BUF_SIZE: number = 1000;
    private readonly CARD_BUF_SIZE: number = 10;

    constructor(
        @Inject(IngestionServicePort) private readonly ingestionService: IngestionServicePort,
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(SetService) private readonly setService: SetService,
        @Inject(PriceService) private readonly priceService: PriceService,
    ) {
        this.LOGGER.debug("Initialized");
    }

    @Timing()
    async ingestAllSetMeta(): Promise<void> {
        this.LOGGER.debug(`ingest meta data for all sets`);
        const setMeta: CreateSetDto[] = await this.ingestionService.fetchAllSetsMeta() ?? [];
        const savedSets: Set[] = await this.setService.save(setMeta);
        this.LOGGER.log(`Saved Sets size: ${savedSets.length}`);
    }

    @Timing()
    async ingestAllSetCards(): Promise<void> {
        this.LOGGER.debug(`ingest all cards for all sets`);
        const missedSets: string[] = [];
        const sets: Set[] = await this.setService.findAll();
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
        const buffer: Card[] = [];
        for await (const card of this.ingestionService.fetchSetCards(code)) {
            buffer.push(card);
            if (buffer.length >= this.CARD_BUF_SIZE) {
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
        const buffer: Price[] = [];
        for await (const price of this.ingestionService.fetchTodayPrices()) {
            buffer.push(price);
            if (buffer.length >= this.PRICE_BUF_SIZE) {
                await this.flushBuffer(buffer, this.priceService.save.bind(this.priceService));
            }
        }
        if (buffer.length > 0) {
            await this.flushBuffer(buffer, this.priceService.save.bind(this.priceService));
        }
        this.LOGGER.log(`Price ingestion completed.`);
    }

    @Timing()
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
}
