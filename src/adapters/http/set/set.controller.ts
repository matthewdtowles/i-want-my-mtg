import {
    Controller,
    Get,
    Inject, Param,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { SetListViewDto } from "src/adapters/http/set/dto/set-list.view.dto";
import { SetViewDto } from "src/adapters/http/set/dto/set.view.dto";
import { SetOrchestrator } from "src/adapters/http/set/set.orchestrator";

@Controller("sets")
export class SetController {

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(UserGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        return this.setOrchestrator.findSetList(req);
    }

    @UseGuards(UserGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(@Param("setCode") setCode: string, @Req() req: AuthenticatedRequest): Promise<SetViewDto> {
        return this.setOrchestrator.findBySetCode(setCode, req);
    }
}
