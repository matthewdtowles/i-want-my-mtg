import { Controller, Get, Inject, Render, Req, UseGuards } from "@nestjs/common";
import { QueryOptionsDto } from "src/core/query/query-options.dto";
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
        const query: QueryOptionsDto = new QueryOptionsDto(req.query);
        return await this.setOrchestrator.findSetList(req, [], query);
    }
}