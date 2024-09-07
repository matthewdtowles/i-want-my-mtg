import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { SetDto } from "src/core/set/dto/set.dto";
import { SetServicePort } from "src/core/set/ports/set.service.port";

@Injectable()
export class SetCli {

    private readonly LOGGER: Logger = new Logger(SetCli.name);

    constructor(
        @Inject(SetServicePort) private readonly service: SetServicePort
    ) { }


    @Command({
        command: 'list-sets',
        describe: 'Retrieve list of all sets without cards'
    })
    async listSets(): Promise<void> {
        const sets: SetDto[] = await this.service.findAll();
        this.LOGGER.log(this.formatOutput(sets));
    }


    @Command({
        command: 'set-by-code <code>',
        describe: 'Retrieve list of all sets without cards'
    })
    async getSetByCode(@Positional({
        name: 'code',
        describe: 'the official set code',
        type: 'string'
    }) code: string): Promise<void> {
        const sets: SetDto = await this.service.findByCode(code);
        this.LOGGER.log(this.formatOutput(sets));
    }


    private formatOutput(sets: SetDto[] | SetDto): string {
        return `\n${JSON.stringify(sets, null, 4)}`;
    }
}