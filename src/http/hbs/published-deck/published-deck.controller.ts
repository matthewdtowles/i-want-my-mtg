import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Render,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PublishedDeckOrchestrator } from './published-deck.orchestrator';
import {
    PublishedDeckDetailViewDto,
    PublishedDeckListViewDto,
    PublishedDeckRowPage,
} from './dto/published-deck.view.dto';

@Controller('published-decks')
export class PublishedDeckController {
    constructor(
        @Inject(PublishedDeckOrchestrator)
        private readonly orchestrator: PublishedDeckOrchestrator
    ) {}

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('publishedDecks')
    async list(@Req() req: AuthenticatedRequest): Promise<PublishedDeckListViewDto> {
        return this.orchestrator.buildListView(req);
    }

    // AJAX: a batch of decks for one format's row (side-scroll + "view all").
    // Declared before :id so "rows" isn't parsed as a deck id.
    @UseGuards(OptionalAuthGuard)
    @Get('rows')
    async rows(
        @Query('format') format?: string,
        @Query('offset') offset?: string,
        @Query('limit') limit?: string
    ): Promise<{ success: boolean; data: PublishedDeckRowPage }> {
        const page = await this.orchestrator.buildRow(
            format || undefined,
            parseInt(offset ?? '0', 10),
            parseInt(limit ?? '12', 10)
        );
        return { success: true, data: page };
    }

    @UseGuards(OptionalAuthGuard)
    @Get(':id')
    @Render('publishedDeckDetail')
    async detail(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<PublishedDeckDetailViewDto> {
        return this.orchestrator.buildDetailView(req, id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/clone')
    async clone(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        const deckId = await this.orchestrator.cloneToUserDeck(req, id);
        res.redirect(`/decks/${deckId}`);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/missing-to-buy-list')
    @HttpCode(HttpStatus.OK)
    async missingToBuyList(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<{ added: number }> {
        const added = await this.orchestrator.addMissingToBuyList(req, id);
        return { added };
    }
}
