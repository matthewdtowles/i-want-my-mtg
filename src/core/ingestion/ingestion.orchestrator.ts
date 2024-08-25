import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from '@nestjs/schedule';
import { Command } from 'nestjs-command';
import { CardDto } from "../card/dto/card.dto";
import { CreateCardDto } from "../card/dto/create-card.dto";
import { CardServicePort } from "../card/ports/card.service.port";
import { CreateSetDto } from "../set/dto/create-set.dto";
import { SetDto } from "../set/dto/set.dto";
import { SetServicePort } from "../set/ports/set.service.port";
import { IngestionServicePort } from "./ingestion.service.port";


@Injectable()
export class IngestionOrchestrator {

    private readonly LOGGER: Logger = new Logger(IngestionOrchestrator.name);

    constructor(
        private readonly ingestionService: IngestionServicePort,
        private readonly cardService: CardServicePort,
        private readonly setService: SetServicePort,
    ) { }


    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    @Command({
        command: 'ingest:all-set-meta',
        describe: 'Ingest all set meta for every set from external API',
    })
    async ingestAllSetMeta(): Promise<SetDto[]> {
        this.LOGGER.debug(`ingestAllSetMeta`);
        const setMeta: CreateSetDto[] = await this.ingestionService.fetchAllSetsMeta();
        const savedSets: SetDto[] = await this.setService.save(setMeta);
        this.LOGGER.log(`Saved Sets: ${savedSets.forEach(ss => { ss.name })}`);
        return savedSets;
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    @Command({
        command: 'ingest:set-by-code <code>',
        describe: 'Ingest set and all cards in set from external API',
    })
    async ingestSetByCode(code: string): Promise<SetDto> {
        this.LOGGER.debug(`ingestSetByCode: ${code}`);
        const set: CreateSetDto = await this.ingestionService.fetchSetByCode(code);
        const savedSet: SetDto[] = await this.setService.save([set]);
        this.LOGGER.log(`Saved set with code ${code}`);
        return savedSet && savedSet.length === 1 ? savedSet[0] : undefined;
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    @Command({
        command: 'ingest:cards-in-set <code>',
        describe: 'Ingest all cards in set from external API',
    })
    async ingestSetCards(code: string): Promise<CardDto[]> {
        this.LOGGER.debug(`ingestSetCards for set code: ${code}`);
        const cards: CreateCardDto[] = await this.ingestionService.fetchSetCards(code);
        const savedCards: CardDto[] = await this.cardService.save(cards);
        this.LOGGER.log(`Saved ${savedCards.length} cards in set ${code}`);
        return savedCards;
    }
}
