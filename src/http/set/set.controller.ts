import {
    Controller,
    Get,
    Inject,
    Param,
    ParseIntPipe,
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
    private readonly breadcrumbs = [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" }
    ];

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render("setListPage")
    async setListing(
        @Req() req: AuthenticatedRequest,
        @Query("page") page: string = "1"
    ): Promise<SetListViewDto> {
        const pageNumber = Math.max(1, parseInt(page) || 1);
        const defaultPageSize = 20;
        return this.setOrchestrator.findSetListPaginated(req, this.breadcrumbs, pageNumber, defaultPageSize);
    }

    @UseGuards(OptionalAuthGuard)
    @Get("page/:page")
    @Render("setListPage")
    async setListingPage(
        @Req() req: AuthenticatedRequest,
        @Param("page", ParseIntPipe) page: number
    ): Promise<SetListViewDto> {
        const limit = 20;
        return this.setOrchestrator.findSetListPaginated(req, this.breadcrumbs, page, limit);
    }

    @UseGuards(OptionalAuthGuard)
    @Get("page/:page/limit/:limit")
    @Render("setListPage")
    async setListingPageWithLimit(
        @Req() req: AuthenticatedRequest,
        @Param("page", ParseIntPipe) page: number,
        @Param("limit", ParseIntPipe) limit: number
    ): Promise<SetListViewDto> {
        return this.setOrchestrator.findSetListPaginated(req, this.breadcrumbs, page, limit);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(@Param("setCode") setCode: string, @Req() req: AuthenticatedRequest): Promise<SetViewDto> {
        return this.setOrchestrator.findBySetCode(setCode, req);
    }

}
