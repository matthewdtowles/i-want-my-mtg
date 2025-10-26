import { Controller, Get, Inject, Logger, Render, Req, UseGuards } from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { getLogger } from "src/logger/global-app-logger";
import { OptionalAuthGuard } from "./auth/optional-auth.guard";
import { AuthenticatedRequest } from "./base/authenticated.request";
import { SetListViewDto } from "./set/dto/set-list.view.dto";
import { SetOrchestrator } from "./set/set.orchestrator";


@Controller()
export class HomeController {

    private readonly LOGGER = getLogger(HomeController.name);

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get("/")
    @Render("home")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.log(`Home page - find initial set list.`);
        const options: SafeQueryOptions = new SafeQueryOptions(req.query);
        const setListView = await this.setOrchestrator.findSetList(req, [], options);
        this.LOGGER.log(`Found initial set list with ${setListView?.setList?.length} sets on Home page.`);
        return setListView;
    }
}