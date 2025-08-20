import { Controller, Get, Inject, Logger, Render, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { UserGuard } from "src/http/auth/user.guard";
import { SetListViewDto } from "src/http/set/dto/set-list.view.dto";
import { SetOrchestrator } from "src/http/set/set.orchestrator";


@Controller()
export class HomeController {
    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(UserGuard)
    @Get("/")
    @Render("setListpage")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        return await this.setOrchestrator.findSetList(req, []); // no breadcrumbs needed for home page
    }
}