import {
    Controller,
    Get, Inject, Param, Query, Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { CardOrchestrator } from "src/http/card/card.orchestrator";
import { CardViewDto } from "src/http/card/dto/card.view.dto";
import { sanitizeInt } from "src/http/http.util";

@Controller("card")
export class CardController {

    private readonly defaultLimit = 10;

    constructor(@Inject(CardOrchestrator) private readonly cardOrchestrator: CardOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: string,
        @Query("page") pageRaw?: string,
        @Query("limit") limitRaw?: string
    ): Promise<CardViewDto> {
        const limit = sanitizeInt(limitRaw, this.defaultLimit);
        const lastPage = await this.cardOrchestrator.getPrintingsLastPage(setNumber, limit);
        const page = Math.min(sanitizeInt(pageRaw, 1), lastPage);
        return this.cardOrchestrator.findSetCard(req, setCode, setNumber, page, limit);
    }
}
