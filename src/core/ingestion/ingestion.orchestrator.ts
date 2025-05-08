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

@Injectable()
export class IngestionOrchestrator implements IngestionOrchestratorPort {
    private readonly LOGGER: Logger = new Logger(IngestionOrchestrator.name);
    private readonly BATCH_SIZE: number = 100;

    constructor(
        @Inject(IngestionServicePort) private readonly ingestionService: IngestionServicePort,
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
        @Inject(SetServicePort) private readonly setService: SetServicePort,
        @Inject(PriceServicePort) private readonly priceService: PriceServicePort,
    ) {
        this.LOGGER.debug("Initialized");
    }

    async ingestAllSetMeta(): Promise<SetDto[]> {
        this.LOGGER.debug(`ingest meta data for all sets`);
        const setMeta: CreateSetDto[] = await this.ingestionService.fetchAllSetsMeta() ?? [];
        const savedSets: SetDto[] = await this.setService.save(setMeta);
        this.LOGGER.log(`Saved Sets size: ${savedSets.length}`);
        return savedSets;
    }

    async ingestAllSetCards(): Promise<SetDto[]> {
        this.LOGGER.debug(`ingest all cards for all sets`);
        const missedSets: string[] = [];
        const sets: SetDto[] = await this.setService.findAll();
        for (let i = 0; i < sets.length; i++) {
            try {
                const cards: CardDto[] = await this.ingestSetCards(sets[i].code);
                for (let j = 0; j < cards.length; j++) {
                    sets[i].cards.push(cards[j]);
                }
            } catch (error) {
                this.LOGGER.error(`Failed to ingest set cards for set ${sets[i].code}: ${error}`);
                missedSets.push(sets[i].code);
            }
        }
        this.LOGGER.log(`Missed Sets: ${JSON.stringify(missedSets)}`);
        return sets;
    }

    async ingestSetCards(code: string): Promise<CardDto[]> {
        this.LOGGER.debug(`ingest set cards for set code: ${code}`);
        const cards: CreateCardDto[] = await this.ingestionService.fetchSetCards(code);
        const savedCards: CardDto[] = await this.cardService.save(cards);
        this.LOGGER.log(`Saved ${savedCards.length} cards in set ${code}`);
        return savedCards;
    }

    async ingestTodayPrices(): Promise<void> {
        this.LOGGER.debug(`Ingest prices for today.`);
        const batch: CreatePriceDto[] = [];
        for await (const priceDto of this.ingestionService.fetchTodayPrices()) {
            batch.push(priceDto);
            if (batch.length >= this.BATCH_SIZE) {
                await this.flushBatch(batch);
            }
        }
        if (batch.length > 0) {
            await this.flushBatch(batch);
        }
        this.LOGGER.log(`Price ingestion completed.`);
    }

    async fillMissingPrices(): Promise<void> {
        this.LOGGER.debug(`Fill missing prices for today.`);
        const date: string = this.todayDateStr();
        await this.priceService.fillMissingPrices(date);
        this.LOGGER.log(`Missing prices filled for date: ${date}`);
    }

    private async flushBatch(batch: CreatePriceDto[]): Promise<void> {
        try {
            await this.priceService.save(batch);
        } catch (error) {
            this.LOGGER.error(`Failed to save batch: ${error}`);
        } finally {
            // Clear the batch after processing
            batch.length = 0;
        }
    }

    private todayDateStr(): string {
        return new Date().toISOString().split("T")[0];
    }
}
