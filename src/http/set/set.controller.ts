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
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { safeAlphaNumeric, sanitizeInt } from "src/core/query/query.util";
import { SetListViewDto } from "./dto/set-list.view.dto";
import { SetViewDto } from "./dto/set.view.dto";
import { SetOrchestrator } from "./set.orchestrator";
import { QueryOptionsDto } from "../../core/query/query-options.dto";
import { query, raw } from "express";

@Controller("sets")
export class SetController {

    private readonly LOGGER: Logger = new Logger(SetController.name);

    private readonly breadcrumbs = [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" }
    ];
    private readonly defaultLimit = 25;

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest, @Query() query: any): Promise<SetListViewDto> {
        const rawQueryOptions = new QueryOptionsDto(query);
        const lastPage = await this.setOrchestrator.getLastPage(rawQueryOptions.limit, rawQueryOptions.filter);
        const queryOptions = new QueryOptionsDto({
            ...rawQueryOptions,
            page: Math.min(sanitizeInt(query.page, 1), lastPage)
        });
        return this.setOrchestrator.findSetList(req, this.breadcrumbs, queryOptions.page, queryOptions.limit, queryOptions.filter);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Query() query: any
    ): Promise<SetViewDto> {
        const rawQueryOptions = new QueryOptionsDto(query);
        const lastPage = await this.setOrchestrator.getLastCardPage(setCode, rawQueryOptions.limit, rawQueryOptions.filter);
        const queryOptions = new QueryOptionsDto({
            ...rawQueryOptions,
            page: Math.min(sanitizeInt(query.page, 1), lastPage)
        });
        return this.setOrchestrator.findBySetCode(req, setCode, queryOptions.page, queryOptions.limit, queryOptions.filter);
    }
}
