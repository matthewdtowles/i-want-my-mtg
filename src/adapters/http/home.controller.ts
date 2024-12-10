import { Controller, Get, Inject, Logger, Render, Req } from "@nestjs/common";
import { Request } from "express";
import { ActionStatus } from "src/adapters/http/http.types";
import { SetListHttpDto } from "src/adapters/http/set.controller";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";

@Controller()
export class HomeController {
    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(@Inject(SetServicePort) private readonly setService: SetServicePort) { }

    @Get("/")
    @Render("index")
    async getHomePage(@Req() req: Request): Promise<SetListHttpDto> {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        const setDtos: SetDto[] = await this.setService.findAll();
        const _message: string = req.query.message as string ?? null;
        return {
            authenticated: req.isAuthenticated(),
            message: _message,
            setList: setDtos,
            status: setDtos ? ActionStatus.SUCCESS : ActionStatus.ERROR
        };
    }
}
