import { Controller, Get, Inject, Param, ParseIntPipe, Render, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { DeckPageOrchestrator } from './deck-page.orchestrator';
import { DeckDetailViewDto, DeckListViewDto } from './dto/deck.view.dto';

@Controller('decks')
export class DeckPageController {
    constructor(
        @Inject(DeckPageOrchestrator) private readonly orchestrator: DeckPageOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('decks')
    async list(@Req() req: AuthenticatedRequest): Promise<DeckListViewDto> {
        return this.orchestrator.buildListView(req);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @Render('deckDetail')
    async detail(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<DeckDetailViewDto> {
        return this.orchestrator.buildDetailView(req, id);
    }
}
