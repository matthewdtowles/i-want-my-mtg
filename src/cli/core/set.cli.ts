import { Inject, Injectable, Logger } from "@nestjs/common";
import { SetServicePort } from "src/core/set/ports/set.service.port";

@Injectable()
export class SetCli {

    private readonly LOGGER: Logger = new Logger(SetCli.name);

    constructor(
        @Inject(SetServicePort) private readonly service: SetServicePort
    ) { }

    
}