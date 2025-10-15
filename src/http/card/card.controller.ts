import {
    Controller,
    Get, Inject, Param,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { QueryOptionsDto } from "src/core/query/query-options.dto";
import { sanitizeInt } from "src/core/query/query.util";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { CardOrchestrator } from "./card.orchestrator";
import { CardViewDto } from "./dto/card.view.dto";

@Controller("card")
export class CardController {

    constructor(@Inject(CardOrchestrator) private readonly cardOrchestrator: CardOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: string,
    ): Promise<CardViewDto> {
        const rawQuery = new QueryOptionsDto(req.query);
        const lastPage = await this.cardOrchestrator.getPrintingsLastPage(setCode, rawQuery);
        const query = new QueryOptionsDto({
            ...rawQuery,
            page: Math.min(sanitizeInt(rawQuery.page, 1), lastPage),
        });
        return this.cardOrchestrator.findSetCard(req, setCode, setNumber, query);
    }
}
