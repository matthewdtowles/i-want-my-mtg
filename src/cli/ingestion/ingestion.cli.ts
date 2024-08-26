import { Injectable, Logger } from '@nestjs/common';
import { Command, Positional } from 'nestjs-command';
import { CardDto } from 'src/core/card/dto/card.dto';
import { IngestionOrchestrator } from 'src/core/ingestion/ingestion.orchestrator';
import { SetDto } from 'src/core/set/dto/set.dto';

@Injectable()
export class IngestionCli {

    private readonly LOGGER: Logger = new Logger(IngestionCli.name);

    constructor(private readonly orchestrator: IngestionOrchestrator) { }

    @Command({
        command: 'ingest:all-set-meta',
        describe: 'Ingest all set meta for every set from external API',
    })
    async ingestAllSetMeta(): Promise<SetDto[]> {
        this.LOGGER.debug(`ingestAllSetMeta invoked`);
        return await this.orchestrator.ingestAllSetMeta();
    }

    @Command({
        command: 'ingest:set-by-code <code>',
        describe: 'Ingest set and all cards in set from external API',
    })
    async ingestSetByCode(@Positional({
        name: 'code',
        describe: 'the set code',
        type: 'string'
    }) code: string): Promise<SetDto> {
        this.LOGGER.debug(`ingestSetByCode invoked with code: ${code}`);
        return await this.orchestrator.ingestSetByCode(code);
    }

    @Command({
        command: 'ingest:cards-in-set <code>',
        describe: 'Ingest all cards in set from external API',
    })
    async ingestSetCards(@Positional({
        name: 'code',
        describe: 'the set code',
        type: 'string'
    }) code: string): Promise<CardDto[]> {
        this.LOGGER.debug(`ingestSetCards invoked with code: ${code}`);
        return await this.orchestrator.ingestSetCards(code);
    }
}