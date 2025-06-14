import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";

@Injectable()
export class SetCli {

    private readonly LOGGER: Logger = new Logger(SetCli.name);

    constructor(@Inject(SetService) private readonly service: SetService) { }


    @Command({
        command: "sets:get",
        describe: "Retrieve list of all sets without cards"
    })
    async listSets(): Promise<void> {
        const sets: Set[] = await this.service.findAll();
        this.LOGGER.log(this.formatOutput(sets));
    }


    @Command({
        command: "set:get <code>",
        describe: "Retrieve list of all sets without cards"
    })
    async getSetByCode(@Positional({
        name: "code",
        describe: "the official set code",
        type: "string"
    }) code: string): Promise<void> {
        const sets: Set = await this.service.findByCode(code);
        this.LOGGER.log(this.formatOutput(sets));
    }


    private formatOutput(sets: Set[] | Set): string {
        return `\n${JSON.stringify(sets, null, 2)}`;
    }
}
