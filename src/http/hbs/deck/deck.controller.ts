import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Redirect,
    Render,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Format } from 'src/core/card/format.enum';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { DeckDetailViewDto } from './dto/deck-detail.view.dto';
import { DeckListViewDto } from './dto/deck-list.view.dto';
import { DeckOrchestrator } from './deck.orchestrator';

@Controller('decks')
@UseGuards(JwtAuthGuard)
export class DeckController {
    constructor(
        @Inject(DeckOrchestrator) private readonly orchestrator: DeckOrchestrator,
        @Inject(DeckService) private readonly deckService: DeckService
    ) {}

    @Get()
    @Render('decks')
    async list(@Req() req: AuthenticatedRequest): Promise<DeckListViewDto> {
        return this.orchestrator.buildListView(req);
    }

    @Post()
    async create(
        @Body() body: { name?: string; format?: string; description?: string },
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        try {
            const format = body.format ? (body.format as Format) : null;
            const deck = await this.deckService.createDeck(
                new Deck({
                    userId: req.user.id,
                    name: (body.name ?? '').trim(),
                    format,
                    description: body.description?.trim() || null,
                })
            );
            res.redirect(`/decks/${deck.id}`);
        } catch (error) {
            if (
                error instanceof DomainValidationError ||
                error?.message?.includes('Invalid initialization')
            ) {
                throw new BadRequestException(error.message);
            }
            throw error;
        }
    }

    @Get(':id')
    @Render('deck')
    async detail(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<DeckDetailViewDto> {
        return this.orchestrator.buildDetailView(req, id);
    }

    @Post(':id/update')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { name?: string; format?: string; description?: string },
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        try {
            await this.deckService.updateDeck(id, req.user.id, {
                name: body.name?.trim(),
                format: body.format ? (body.format as Format) : null,
                description: body.description?.trim() || null,
            });
            res.redirect(`/decks/${id}`);
        } catch (error) {
            this.handleMutationError(error);
        }
    }

    @Post(':id/delete')
    @Redirect('/decks', 302)
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<void> {
        try {
            await this.deckService.deleteDeck(id, req.user.id);
        } catch (error) {
            this.handleMutationError(error);
        }
    }

    @Post(':id/cards')
    async setCard(
        @Param('id', ParseIntPipe) id: number,
        @Body()
        body: {
            cardId?: string;
            quantity?: string;
            isSideboard?: string;
            returnUrl?: string;
        },
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        try {
            const cardId = (body.cardId ?? '').trim();
            const quantity = parseInt(body.quantity ?? '0', 10);
            const isSideboard = body.isSideboard === 'true' || body.isSideboard === 'on';
            if (!cardId) throw new BadRequestException('cardId required');
            if (Number.isNaN(quantity) || quantity < 0) {
                throw new BadRequestException('Invalid quantity');
            }
            await this.deckService.setCardQuantity(
                id,
                req.user.id,
                cardId,
                quantity,
                isSideboard
            );
            res.redirect(body.returnUrl || `/decks/${id}`);
        } catch (error) {
            this.handleMutationError(error);
        }
    }

    private handleMutationError(error: unknown): never {
        if (error instanceof DomainNotFoundError) {
            throw new NotFoundException('Deck not found');
        }
        if (error instanceof DomainNotAuthorizedError) {
            throw new NotFoundException('Deck not found');
        }
        if (error instanceof DomainValidationError) {
            throw new BadRequestException(error.message);
        }
        throw error as Error;
    }
}
