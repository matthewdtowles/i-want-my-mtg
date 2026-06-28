import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeckBuildabilityService } from 'src/core/deck/deck-buildability.service';
import { DeckImportService } from 'src/core/deck/deck-import.service';
import { DeckService } from 'src/core/deck/deck.service';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { JwtOrApiKeyGuard } from '../shared/jwt-or-api-key.guard';
import { DeckApiPresenter } from './deck-api.presenter';
import {
    DeckCardAddApiDto,
    DeckCardRemoveApiDto,
    DeckCardSetQuantityApiDto,
    DeckCreateApiDto,
    DeckImportApiDto,
    DeckUpdateApiDto,
} from './dto/deck-request-api.dto';
import {
    DeckDetailApiDto,
    DeckImportApiResultDto,
    DeckMissingToBuyListResultDto,
    DeckSummaryApiDto,
} from './dto/deck-response.dto';

@ApiTags('Decks')
@ApiBearerAuth()
@Controller('api/v1/decks')
@UseGuards(JwtOrApiKeyGuard, ApiRateLimitGuard)
export class DeckApiController {
    constructor(
        @Inject(DeckService) private readonly deckService: DeckService,
        @Inject(DeckImportService) private readonly deckImportService: DeckImportService,
        @Inject(DeckBuildabilityService)
        private readonly buildabilityService: DeckBuildabilityService
    ) {}

    @Get()
    @ApiOperation({ summary: "List the authenticated user's decks" })
    @ApiOkEnvelope(DeckSummaryApiDto, { isArray: true, description: 'Deck summaries' })
    async list(@Req() req: AuthenticatedRequest): Promise<ApiResponseDto<DeckSummaryApiDto[]>> {
        const decks = await this.deckService.listDecks(req.user.id);
        return ApiResponseDto.ok(decks.map((d) => DeckApiPresenter.toSummary(d)));
    }

    @Post()
    @ApiOperation({ summary: 'Create a deck' })
    @ApiOkEnvelope(DeckDetailApiDto, { status: 201, description: 'Created deck' })
    async create(
        @Body() dto: DeckCreateApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckDetailApiDto>> {
        const deck = await this.deckService.createDeck(req.user.id, dto.name, dto.format ?? null);
        return ApiResponseDto.ok(DeckApiPresenter.toDetail(deck));
    }

    @Post('import')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Create a deck from pasted decklist text' })
    @ApiOkEnvelope(DeckImportApiResultDto, {
        description: 'Import result with the new deck id + unresolved lines',
    })
    async import(
        @Body() dto: DeckImportApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckImportApiResultDto>> {
        const result = await this.deckImportService.importDecklist(
            req.user.id,
            dto.name,
            dto.format ?? null,
            dto.text
        );
        return ApiResponseDto.ok(result);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a deck with its cards' })
    @ApiOkEnvelope(DeckDetailApiDto, { description: 'Deck detail' })
    @ApiResponse({ status: 404, description: 'Deck not found' })
    async get(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckDetailApiDto>> {
        const deck = await this.deckService.getDeck(id, req.user.id);
        if (!deck) {
            throw new NotFoundException(`Deck ${id} not found.`);
        }
        return ApiResponseDto.ok(DeckApiPresenter.toDetail(deck));
    }

    @Post(':id/missing-to-buy-list')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Add the deck's missing cards (vs. inventory) to the buy-list" })
    @ApiOkEnvelope(DeckMissingToBuyListResultDto, { description: 'Count of distinct cards added' })
    @ApiResponse({ status: 404, description: 'Deck not found' })
    async missingToBuyList(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckMissingToBuyListResultDto>> {
        const deck = await this.deckService.getDeck(id, req.user.id);
        if (!deck) {
            throw new NotFoundException(`Deck ${id} not found.`);
        }
        const added = await this.buildabilityService.addMissingToBuyList(
            deck.cards ?? [],
            req.user.id
        );
        return ApiResponseDto.ok({ added });
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Rename / re-format a deck' })
    @ApiOkEnvelope(DeckSummaryApiDto, { description: 'Updated deck' })
    @ApiResponse({ status: 404, description: 'Deck not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: DeckUpdateApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckSummaryApiDto>> {
        const deck = await this.deckService.updateDeck(id, req.user.id, dto.name, dto.format ?? null);
        return ApiResponseDto.ok(DeckApiPresenter.toSummary(deck));
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a deck' })
    @ApiResponse({ status: 200, description: 'Deleted' })
    @ApiResponse({ status: 404, description: 'Deck not found' })
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        await this.deckService.deleteDeck(id, req.user.id);
        return ApiResponseDto.ok({ deleted: true });
    }

    @Post(':id/cards')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Add a card to a deck (increments quantity)' })
    @ApiResponse({ status: 200, description: 'Added' })
    async addCard(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: DeckCardAddApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ added: boolean }>> {
        await this.deckService.addCard(
            id,
            req.user.id,
            dto.cardId,
            dto.isSideboard ?? false,
            dto.quantity ?? 1
        );
        return ApiResponseDto.ok({ added: true });
    }

    @Patch(':id/cards')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Set the absolute quantity for a card (0 removes it)' })
    @ApiResponse({ status: 200, description: 'Updated' })
    async setCardQuantity(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: DeckCardSetQuantityApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ updated: boolean }>> {
        await this.deckService.setCardQuantity(
            id,
            req.user.id,
            dto.cardId,
            dto.isSideboard,
            dto.quantity
        );
        return ApiResponseDto.ok({ updated: true });
    }

    @Delete(':id/cards')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove a card from a deck' })
    @ApiResponse({ status: 200, description: 'Removed' })
    async removeCard(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: DeckCardRemoveApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        await this.deckService.removeCard(id, req.user.id, dto.cardId, dto.isSideboard);
        return ApiResponseDto.ok({ deleted: true });
    }
}
