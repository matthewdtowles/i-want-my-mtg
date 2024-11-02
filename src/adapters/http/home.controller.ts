import { Controller, Get, Inject, Logger, Render, Req } from "@nestjs/common";
import { Request } from "express";
import { SetDto } from "src/core/set/dto/set.dto";
import { SetServicePort } from "src/core/set/ports/set.service.port";

@Controller()
export class HomeController {
    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(
        @Inject(SetServicePort) private readonly setService: SetServicePort,
    ) { }

    @Get("/")
    @Render("index")
    async getHomePage(@Req() req: Request) {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        const setDtos: SetDto[] = await this.setService.findAll();
        // if number of action/status combos grows, create their own map/dict
        const _status =
            req &&
            req.query &&
            "200" === req.query.status &&
            "logout" === req.query.action;
        const _message: string = _status ? `User logged out` : null;
        return {
            message: _message,
            status: _status,
            setList: setDtos,
        };
    }
}
