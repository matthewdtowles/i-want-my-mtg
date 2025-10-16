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
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
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
        const rawQuery = new SafeQueryOptions(req.query);
        const lastPage = await this.setOrchestrator.getLastPage(rawQuery);
        const options = new SafeQueryOptions({
            ...rawQuery,
            page: Math.min(rawQuery.page, lastPage)
        });
        return this.setOrchestrator.findSetList(req, this.breadcrumbs, options);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Query() query: any
    ): Promise<SetViewDto> {
        const rawQuery = new SafeQueryOptions(query);
        const lastPage = await this.setOrchestrator.getLastCardPage(setCode, rawQuery);
        const options = new SafeQueryOptions({
            ...rawQuery,
            page: Math.min(rawQuery.page, lastPage)
        });
        return this.setOrchestrator.findBySetCode(req, setCode, options);
    }
}
