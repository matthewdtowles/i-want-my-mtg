import { Controller, Get, Inject, Render, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { SetListViewDto } from "src/http/set/dto/set-list.view.dto";
import { SetOrchestrator } from "src/http/set/set.orchestrator";


@Controller()
export class HomeController {
    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get("/")
    @Render("setListPage")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        return await this.setOrchestrator.findSetList(req, [], 1, 20);
    }
}