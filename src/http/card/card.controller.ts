import {
    Controller,
    Get, Inject, Param, Query, Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { sanitizeInt } from "src/http/base/http.util";
import { CardOrchestrator } from "./card.orchestrator";
import { CardViewDto } from "./dto/card.view.dto";

@Controller("card")
export class CardController {

    private readonly defaultLimit = 25;

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
        const page = sanitizeInt(pageRaw, 1);
        return this.cardOrchestrator.findSetCard(req, setCode, setNumber, page, limit);
    }
}
