import { Controller, Get, Inject, Logger, Render } from "@nestjs/common";
import { SetDto } from "src/core/set/dto/set.dto";
import { SetServicePort } from "src/core/set/ports/set.service.port";

@Controller()
export class HomeController {

    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(@Inject(SetServicePort) private readonly serService: SetServicePort) { }

    @Get('/')
    @Render('index')
    async getHomePage(): Promise<{ setList: SetDto[] }> {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        return { setList: await this.serService.findAll() };
    }
}