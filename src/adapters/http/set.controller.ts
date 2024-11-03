import { Controller, Get, Inject, Logger, Param, Render } from "@nestjs/common";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";

@Controller("sets")
export class SetController {
    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(
        @Inject(SetServicePort) private readonly setService: SetServicePort,
    ) { }

    @Get()
    @Render("setListPage")
    async setListing(): Promise<{ setList: SetDto[] }> {
        this.LOGGER.debug(`get setListing`);
        return { setList: await this.setService.findAll() };
    }

    @Get(":setCode")
    @Render("set")
    async findBySetCode(@Param("setCode") setCode: string): Promise<SetDto> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
        return await this.setService.findByCode(setCode);
    }
}
