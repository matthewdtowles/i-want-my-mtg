import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { Card, CardService } from "src/core/card/";

@Injectable()
export class CardCli {
    private readonly LOGGER: Logger = new Logger(CardCli.name);

    constructor(@Inject(CardService) private readonly service: CardService,) { }


    @Command({
        command: "cards:name-get <name>",
        describe: "Retrieve all cards with given name",
    })
    async getCardsWithName(
        @Positional({
            name: "name",
            describe: "the name of the cards to retrieve",
            type: "string",
        })
        name: string,
    ): Promise<void> {
        const cards: Card[] = await this.service.findAllWithName(name);
        this.LOGGER.log(this.formatOutput(cards));
    }

    @Command({
        command: "card:test",
        describe: "Test Card CLI",
    })
    async cardCliTest(): Promise<void> {
        this.LOGGER.log(`Card CLI invoked`);
    }

    private formatOutput(cards: Card[] | Card): string {
        return `\n${JSON.stringify(cards, null, 2)}`;
    }
}
