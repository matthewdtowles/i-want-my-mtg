import {
    Controller,
    Get,
    Inject,
    Param,
    Query,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { SetListViewDto } from "src/http/set/dto/set-list.view.dto";
import { SetViewDto } from "src/http/set/dto/set.view.dto";
import { SetOrchestrator } from "src/http/set/set.orchestrator";

@Controller("sets")
export class SetController {

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render("setListPage")
    async setListing(
        @Req() req: AuthenticatedRequest,
        @Query('page') page: string = '1'
    ): Promise<SetListViewDto> {
        const pageNumber = Math.max(1, parseInt(page) || 1);
        const defaultPageSize = 20;
        // TODO: this should actually return a wrapper object with total count and items
        return this.setOrchestrator.findSetListPaginated(req, [], pageNumber, defaultPageSize);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(@Param("setCode") setCode: string, @Req() req: AuthenticatedRequest): Promise<SetViewDto> {
        return this.setOrchestrator.findBySetCode(setCode, req);
    }
}
