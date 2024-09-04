import { Inject, Injectable, Logger } from "@nestjs/common";
import { CardServicePort } from "src/core/card/ports/card.service.port";

@Injectable()
export class CardCli {

    private readonly LOGGER: Logger = new Logger(CardCli.name);

    constructor(
        @Inject(CardServicePort) private readonly service: CardServicePort
    ) { }

    
}