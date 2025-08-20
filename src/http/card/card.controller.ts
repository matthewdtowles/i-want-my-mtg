import {
    Controller,
    Get, Inject, Param, Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { UserGuard } from "src/http/auth/user.guard";
import { CardOrchestrator } from "src/http/card/card.orchestrator";
import { CardViewDto } from "src/http/card/dto/card.view.dto";

@Controller("card")
export class CardController {
    constructor(@Inject(CardOrchestrator) private readonly cardOrchestrator: CardOrchestrator) { }

    @UseGuards(UserGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: string,
        @Req() req: AuthenticatedRequest
    ): Promise<CardViewDto> {
        return this.cardOrchestrator.findSetCard(setCode, setNumber, req);
    }
}
