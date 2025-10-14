import { Controller, Get, Inject, Render, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest } from "./auth/dto/authenticated.request";
import { OptionalAuthGuard } from "./auth/optional-auth.guard";
import { SetListViewDto } from "./set/dto/set-list.view.dto";
import { SetOrchestrator } from "./set/set.orchestrator";


@Controller()
export class HomeController {
    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get("/")
    @Render("home")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        return await this.setOrchestrator.findSetList(req, [], 1, 25);
    }
}