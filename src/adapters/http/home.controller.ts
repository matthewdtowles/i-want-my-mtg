import { Controller, Get, Inject, Logger, Render, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { ActionStatus, SetListViewDto } from "src/adapters/http/http.types";
import { Set, SetService } from "src/core/set";

@Controller()
export class HomeController {
    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(@Inject(SetService) private readonly setService: SetService) { }

    @UseGuards(UserGuard)
    @Get("/")
    @Render("setListpage")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        const sets: Set[] = await this.setService.findAll();
        const _message: string = req.query.message as string ?? null;
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [],
            message: _message,
            setList: sets,
            status: sets ? ActionStatus.SUCCESS : ActionStatus.ERROR
        };
    }
}
