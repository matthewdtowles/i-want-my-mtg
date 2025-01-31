import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { CardDto } from "src/core/card/api/card.dto";
import { CardServicePort } from "src/core/card/api/card.service.port";

@Injectable()
export class CardCli {
    private readonly LOGGER: Logger = new Logger(CardCli.name);

    constructor(
        @Inject(CardServicePort) private readonly service: CardServicePort,
    ) { }

    @Command({
        command: "card:get <code> <setNumber>",
        describe: "Retrieve card with set number from set with given code",
    })
    async getCardByNameAndSet(
        @Positional({
            name: "code",
            describe: "the set code of the card",
            type: "string",
        })
        code: string,
        @Positional({
            name: "setNumber",
            describe: "the set number of the card",
            type: "number",
        })
        setNumber: string,
    ): Promise<void> {
        const card: CardDto = await this.service.findBySetCodeAndNumber(
            code,
            setNumber,
        );
        this.LOGGER.log(this.formatOutput(card));
    }

    @Command({
        command: "cards:set-get <code>",
        describe: "Retrieve all cards in set with given code",
    })
    async getSetCards(
        @Positional({
            name: "code",
            describe: "the set code from which all cards are returned",
            type: "string",
        })
        code: string,
    ): Promise<void> {
        const cards: CardDto[] = await this.service.findAllInSet(code);
        this.LOGGER.log(this.formatOutput(cards));
    }

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
        const cards: CardDto[] = await this.service.findAllWithName(name);
        this.LOGGER.log(this.formatOutput(cards));
    }

    @Command({
        command: "card:test",
        describe: "Test Card CLI",
    })
    async cardCliTest(): Promise<void> {
        this.LOGGER.log(`Card CLI invoked`);
    }

    private formatOutput(cards: CardDto[] | CardDto): string {
        return `\n${JSON.stringify(cards, null, 2)}`;
    }
}
