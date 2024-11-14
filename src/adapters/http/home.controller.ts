import { Controller, Get, HttpStatus, Inject, Logger, Render, Req } from "@nestjs/common";
import { HttpStatusCode } from "axios";
import { Request } from "express";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";

@Controller()
export class HomeController {
    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(@Inject(SetServicePort) private readonly setService: SetServicePort) { }

    @Get("/")
    @Render("index")
    async getHomePage(@Req() req: Request) {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        const setDtos: SetDto[] = await this.setService.findAll();
        // if number of action/status combos grows, create their own map/dict
        const _status: string = req.query.status as string ?? null;
        const _message: string = req.query.message as string ?? null;
        return {
            message: _message,
            status: _status,
            setList: setDtos,
        };
    }
}
