import {
    Controller,
    Get,
    Inject,
    Param,
    ParseIntPipe,
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
    private readonly defaultLimit = 20;

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        return this.setOrchestrator.findSetList(req, this.breadcrumbs, 1, this.defaultLimit);
    }

    @UseGuards(OptionalAuthGuard)
    @Get("page/:page")
    @Render("setListPage")
    async setListingPage(
        @Req() req: AuthenticatedRequest,
        @Param("page", ParseIntPipe) page: number
    ): Promise<SetListViewDto> {
        return this.setOrchestrator.findSetList(req, this.breadcrumbs, page, this.defaultLimit);
    }

    @UseGuards(OptionalAuthGuard)
    @Get("page/:page/limit/:limit")
    @Render("setListPage")
    async setListingPageWithLimit(
        @Req() req: AuthenticatedRequest,
        @Param("page", ParseIntPipe) page: number,
        @Param("limit", ParseIntPipe) limit: number
    ): Promise<SetListViewDto> {
        return this.setOrchestrator.findSetList(req, this.breadcrumbs, page, limit);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(@Req() req: AuthenticatedRequest, @Param("setCode") setCode: string): Promise<SetViewDto> {
        return this.setOrchestrator.findBySetCode(req, setCode, 1, this.defaultLimit);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode/page/:page")
    @Render("set")
    async findByCodePage(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Param("page", ParseIntPipe) page: number,
    ): Promise<SetViewDto> {
        return this.setOrchestrator.findBySetCode(req, setCode, page, this.defaultLimit);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode/page/:page/limit/:limit")
    @Render("set")
    async findByCodePageWithLimit(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Param("page", ParseIntPipe) page: number,
        @Param("limit", ParseIntPipe) limit: number,
    ): Promise<SetViewDto> {
        return this.setOrchestrator.findBySetCode(req, setCode, page, limit);
    }

}
