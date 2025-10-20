import { Controller, Get, Inject, Render, Req, UseGuards } from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { OptionalAuthGuard } from "./auth/optional-auth.guard";
import { AuthenticatedRequest } from "./base/authenticated.request";
import { SetListViewDto } from "./set/dto/set-list.view.dto";
import { SetOrchestrator } from "./set/set.orchestrator";


@Controller()
export class HomeController {
    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get("/")
    @Render("home")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        const query: SafeQueryOptions = new SafeQueryOptions(req.query);
        return await this.setOrchestrator.findSetList(req, [], query);
    }
}