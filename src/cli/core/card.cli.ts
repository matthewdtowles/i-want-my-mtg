import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { CardDto } from "src/core/card/dto/card.dto";
import { CardServicePort } from "src/core/card/ports/card.service.port";

@Injectable()
export class CardCli {

    private readonly LOGGER: Logger = new Logger(CardCli.name);

    constructor(
        @Inject(CardServicePort) private readonly service: CardServicePort
    ) { }

    @Command({
        command: 'get-card <code> <setNumber>',
        describe: 'Retrieve card with set number from set with given code'
    })
    async getCardByNameAndSet(
        @Positional({
            name: 'code',
            describe: 'the set code of the card',
            type: 'string'
        }) code: string,
        @Positional({
            name: 'setNumber',
            describe: 'the set number of the card',
            type: 'number'
        }) setNumber: number
    ): Promise<CardDto | null> {
        return this.service.findBySetCodeAndNumber(code, setNumber);
    }

    @Command({
        command: 'card-test',
        describe: 'Test Card CLI',
    })
    async cardCliTest(): Promise<void> {
        this.LOGGER.debug(`Card CLI invoked`);
    }
}