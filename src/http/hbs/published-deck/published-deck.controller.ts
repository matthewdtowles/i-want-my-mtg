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
    async list(
        @Req() req: AuthenticatedRequest,
        @Query('format') format?: string,
        @Query('page') page?: string
    ): Promise<PublishedDeckListViewDto> {
        return this.orchestrator.buildListView(req, format || undefined, parseInt(page ?? '1', 10));
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
