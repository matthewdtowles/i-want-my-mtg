import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    InternalServerErrorException,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckService } from 'src/core/deck/deck.service';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { DeckApiPresenter } from './deck-api.presenter';
import { CreateDeckDto, SetDeckCardDto, UpdateDeckDto } from './dto/deck-request.dto';
import { DeckApiDto } from './dto/deck-response.dto';

@ApiTags('Decks')
@Controller('api/v1/decks')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
@ApiBearerAuth()
export class DeckApiController {
    private readonly LOGGER = getLogger(DeckApiController.name);

    constructor(@Inject(DeckService) private readonly deckService: DeckService) {}

    @Get()
    @ApiOperation({ summary: 'List the current user’s decks' })
    @ApiResponse({ status: 200, description: 'Deck list' })
    async findAll(@Req() req: AuthenticatedRequest): Promise<ApiResponseDto<DeckApiDto[]>> {
        const summaries = await this.deckService.findDecksForUser(req.user.id);
        return ApiResponseDto.ok(summaries.map(DeckApiPresenter.toSummaryDto));
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a deck' })
    @ApiResponse({ status: 201, description: 'Deck created' })
    async create(
        @Body() dto: CreateDeckDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckApiDto>> {
        try {
            const deck = await this.deckService.createDeck(
                new Deck({
                    userId: req.user.id,
                    name: dto.name,
                    format: dto.format ?? null,
                    description: dto.description ?? null,
                })
            );
            return ApiResponseDto.ok(
                DeckApiPresenter.toSummaryDto({
                    deck,
                    cardCount: 0,
                    sideboardCount: 0,
                })
            );
        } catch (error) {
            if (error instanceof DomainValidationError) {
                throw new BadRequestException(error.message);
            }
            if (error?.message?.includes('Invalid initialization')) {
                throw new BadRequestException(error.message);
            }
            this.LOGGER.error(`Create deck failed: ${error?.message ?? error}`);
            throw new InternalServerErrorException('Failed to create deck');
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a deck with its cards' })
    @ApiResponse({ status: 200, description: 'Deck detail' })
    async findOne(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckApiDto>> {
        try {
            const deck = await this.deckService.findDeckWithCards(id, req.user.id);
            return ApiResponseDto.ok(DeckApiPresenter.toDetailDto(deck));
        } catch (error) {
            this.mapError(error, id, 'find');
        }
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update deck metadata' })
    @ApiResponse({ status: 200, description: 'Deck updated' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDeckDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<DeckApiDto>> {
        try {
            const deck = await this.deckService.updateDeck(id, req.user.id, dto);
            return ApiResponseDto.ok(
                DeckApiPresenter.toSummaryDto({
                    deck,
                    cardCount: 0,
                    sideboardCount: 0,
                })
            );
        } catch (error) {
            this.mapError(error, id, 'update');
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a deck' })
    @ApiResponse({ status: 200, description: 'Deck deleted' })
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        try {
            await this.deckService.deleteDeck(id, req.user.id);
            return ApiResponseDto.ok({ deleted: true });
        } catch (error) {
            this.mapError(error, id, 'delete');
        }
    }

    @Put(':id/cards')
    @ApiOperation({ summary: 'Set quantity for a card in the deck (0 removes)' })
    @ApiResponse({ status: 200, description: 'Card set' })
    async setCard(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SetDeckCardDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ ok: true }>> {
        try {
            await this.deckService.setCardQuantity(
                id,
                req.user.id,
                dto.cardId,
                dto.quantity,
                dto.isSideboard ?? false
            );
            return ApiResponseDto.ok({ ok: true });
        } catch (error) {
            if (error instanceof DomainValidationError) {
                throw new BadRequestException(error.message);
            }
            this.mapError(error, id, 'set-card');
        }
    }

    private mapError(error: unknown, id: number, op: string): never {
        if (error instanceof DomainNotFoundError) {
            throw new NotFoundException('Deck not found');
        }
        if (error instanceof DomainNotAuthorizedError) {
            throw new ForbiddenException('Not authorized');
        }
        if (error instanceof DomainValidationError) {
            throw new BadRequestException(error.message);
        }
        this.LOGGER.error(`${op} deck ${id} failed: ${(error as any)?.message ?? error}`);
        throw new InternalServerErrorException(`Failed to ${op} deck`);
    }
}
