import { Controller, Get, Inject, Logger, Render, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { ActionStatus } from "src/adapters/http/http.types";
import { SetListHttpDto } from "src/adapters/http/set.controller";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";

@Controller()
export class HomeController {
    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(@Inject(SetServicePort) private readonly setService: SetServicePort) { }

    @UseGuards(UserGuard)
    @Get("/")
    @Render("index")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListHttpDto> {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        const setDtos: SetDto[] = await this.setService.findAll();
        const _message: string = req.query.message as string ?? null;
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [],
            message: _message,
            setList: setDtos,
            status: setDtos ? ActionStatus.SUCCESS : ActionStatus.ERROR
        };
    }
}
