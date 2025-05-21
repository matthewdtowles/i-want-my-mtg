import { Inject, Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import { Command, Positional } from "nestjs-command";
import * as path from "path";
import { IngestionOrchestratorPort } from "src/core/ingestion/api/ingestion.orchestrator.port";

@Injectable()
export class IngestionCli {
    private readonly LOGGER: Logger = new Logger(IngestionCli.name);

    constructor(
        @Inject(IngestionOrchestratorPort)
        private readonly orchestrator: IngestionOrchestratorPort,
    ) { }

    @Command({
        command: "ingest:all-sets",
        describe: "Ingest all set meta for every set from external API",
    })
    async ingestAllSetMeta(): Promise<void> {
        this.LOGGER.debug(`ingestAllSetMeta invoked`);
        await this.orchestrator.ingestAllSetMeta();
    }

    @Command({
        command: "ingest:file:cards <file>",
        describe: "Ingest all cards in each set from csv file",
    })
    async ingestSetCardsFromFile(
        @Positional({
            name: "file",
            describe: "the set codes",
            type: "string",
        })
        file: string,
    ): Promise<void> {
        const filePath: string = path.resolve(file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const fileContent: string = fs.readFileSync(filePath, 'utf-8');
        const setCodes: string[] = fileContent.split(",");
        for (const code of setCodes) {
            await this.orchestrator.ingestSetCards(code);
        }
    }

    @Command({
        command: "ingest:cards <code>",
        describe: "Ingest all cards in set from external API",
    })
    async ingestSetCards(
        @Positional({
            name: "code",
            describe: "the set code",
            type: "string",
        })
        code: string,
    ): Promise<void> {
        this.LOGGER.debug(`ingestSetCards invoked with code: ${code}`);
        await this.orchestrator.ingestSetCards(code);
    }

    @Command({
        command: "ingest:all-cards",
        describe: "Ingest all cards in all sets",
    })
    async ingestAllCards(): Promise<void> {
        this.LOGGER.debug(`ingestAllCards for every set invoked`);
        await this.orchestrator.ingestAllSetCards();
    }

    @Command({
        command: "ingest:today-prices",
        describe: "Ingest prices for today from external API",
    })
    async ingestTodayPrices(): Promise<void> {
        this.LOGGER.debug(`ingestTodayPrices invoked`);
        await this.orchestrator.ingestTodayPrices();
        // await this.orchestrator.fillMissingPrices();
        this.LOGGER.log(`Today prices ingestion completed successfully.`);
    }



    @Command({
        command: "ingest:test <input>",
        describe: "Ingest test with arguments",
    })
    ingestTest(
        @Positional({
            name: "input",
            describe: "the input arg",
            type: "string",
        })
        input: string,
    ): void {
        this.LOGGER.debug(`ingestTest invoked with input: ${input}`);
    }
}
