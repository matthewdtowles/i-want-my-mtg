import {
    Controller,
    Get,
    Inject,
    Logger,
    Param,
    Query,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { QueryOptionsDto } from "src/core/query/query-options.dto";
import { sanitizeInt } from "src/core/query/query.util";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { SetListViewDto } from "./dto/set-list.view.dto";
import { SetViewDto } from "./dto/set.view.dto";
import { SetOrchestrator } from "./set.orchestrator";

@Controller("sets")
export class SetController {

    private readonly LOGGER: Logger = new Logger(SetController.name);

    private readonly breadcrumbs = [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" }
    ];

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`Set listing AuthenticatedRequest: ${JSON.stringify(req.query)}`);
        const rawQuery = new QueryOptionsDto(req.query);
        const lastPage = await this.setOrchestrator.getLastPage(rawQuery);
        const queryOptions = new QueryOptionsDto({
            ...rawQuery,
            page: Math.min(sanitizeInt(rawQuery.page, 1), lastPage)
        });
        return this.setOrchestrator.findSetList(req, this.breadcrumbs, queryOptions);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Query() query: any
    ): Promise<SetViewDto> {
        const rawQuery = new QueryOptionsDto(query);
        const lastPage = await this.setOrchestrator.getLastCardPage(setCode, rawQuery);
        const queryOptions = new QueryOptionsDto({
            ...rawQuery,
            page: Math.min(sanitizeInt(query.page, 1), lastPage)
        });
        return this.setOrchestrator.findBySetCode(req, setCode, queryOptions);
    }
}
