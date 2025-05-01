import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
import { PriceDto } from "src/core/price/api/price.dto";
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

    async ingestTodayPrices(): Promise<string[]> {
        this.LOGGER.debug(`ingest prices for today`);
        const missedPrices: string[] = [];
        const priceDtos: AsyncGenerator<CreatePriceDto> = this.ingestionService.fetchTodayPrices();
        const batchSize: number = 100;
        const batch: Promise<void>[] = [];
        for await (const price of priceDtos) {
            const uuid: string = price.cardUuid;
            // TODO: add counter for captured prices and missed prices
            // TODO: need to update save to check if price exists and update instead - perhaps use upsert or my own insert/update logic
            batch.push(
                (async () => {
                    try {
                        const card: CardDto = await this.cardService.findByUuid(uuid);
                        if (!card) {
                            throw new Error(`Card with UUID ${uuid} not found`);
                        }
                        await this.priceService.save(price);
                        this.LOGGER.log(`Saved price for card ${uuid}`);
                    } catch (error) {
                        this.LOGGER.error(`Failed to ingest price for card ${uuid}: ${error}`);
                        missedPrices.push(uuid);
                    }
                })()
            );
            if (batch.length >= batchSize) {
                await Promise.all(batch);
                batch.length = 0; // Clear the batch
            }
        }
        // TODO: TRYING TO USE BATCHING
        if (batch.length > 0) {
            await Promise.all(batch);
        }
        this.LOGGER.log(`Total prices that could not be saved: ${missedPrices.length}`);
        return missedPrices;
    }
}
