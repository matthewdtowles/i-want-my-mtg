import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardService } from 'src/core/card/card.service';
import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { TransactionPresenter } from 'src/http/transaction/transaction.presenter';
import { TransactionRequestDto } from 'src/http/transaction/dto/transaction.request.dto';
import { TransactionUpdateRequestDto } from 'src/http/transaction/dto/transaction.update-request.dto';
import { ApiResponseDto } from '../dto/api-response.dto';
import { CostBasisApiDto, TransactionApiItemDto } from '../dto/transaction-response.dto';
import { ApiRateLimitGuard } from '../guards/api-rate-limit.guard';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('api/v1/transactions')
@UseGuards(ApiRateLimitGuard, JwtAuthGuard)
export class TransactionApiController {
    constructor(
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(CardService) private readonly cardService: CardService
    ) {}

    @Get()
    @ApiOperation({ summary: 'List all transactions' })
    @ApiResponse({ status: 200, description: 'Transaction list' })
    async findAll(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<TransactionApiItemDto[]>> {
        const transactions = await this.transactionService.findByUser(req.user.id);
        const cardIds = [...new Set(transactions.map((t) => t.cardId))];
        const cardMap = await this.buildCardMap(cardIds);

        return ApiResponseDto.ok(transactions.map((t) => this.toTransactionItem(t, cardMap)));
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create transaction' })
    @ApiResponse({ status: 201, description: 'Transaction created' })
    async create(
        @Body() dto: TransactionRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<TransactionApiItemDto>> {
        const entity = TransactionPresenter.toEntity(dto, req.user.id);
        const saved = await this.transactionService.create(entity, {
            skipInventorySync: dto.skipInventorySync,
        });
        return ApiResponseDto.ok(this.toTransactionItem(saved, new Map()));
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update transaction' })
    @ApiResponse({ status: 200, description: 'Transaction updated' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: TransactionUpdateRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<TransactionApiItemDto>> {
        const fields: Record<string, unknown> = {};
        if (dto.quantity !== undefined) fields.quantity = dto.quantity;
        if (dto.pricePerUnit !== undefined) fields.pricePerUnit = dto.pricePerUnit;
        if (dto.date !== undefined) fields.date = new Date(dto.date);
        if (dto.source !== undefined) fields.source = dto.source;
        if (dto.fees !== undefined) fields.fees = dto.fees;
        if (dto.notes !== undefined) fields.notes = dto.notes;

        const { updated } = await this.transactionService.update(id, req.user.id, fields);
        return ApiResponseDto.ok(this.toTransactionItem(updated, new Map()));
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete transaction' })
    @ApiResponse({ status: 200, description: 'Transaction deleted' })
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        await this.transactionService.delete(id, req.user.id);
        return ApiResponseDto.ok({ deleted: true });
    }

    @Get('cost-basis/:cardId')
    @ApiOperation({ summary: 'Get cost basis for a card' })
    @ApiQuery({ name: 'isFoil', required: false, description: 'Whether to check foil version' })
    @ApiResponse({ status: 200, description: 'Cost basis data' })
    async getCostBasis(
        @Param('cardId') cardId: string,
        @Query('isFoil') isFoilStr: string,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<CostBasisApiDto>> {
        const isFoil = isFoilStr === 'true';

        // Get current market price from card data
        const cards = await this.cardService.findByIds([cardId]);
        const card = cards?.[0];
        const latestPrice = card?.prices?.[0];
        const marketPrice = isFoil
            ? latestPrice?.foil != null
                ? Number(latestPrice.foil)
                : 0
            : latestPrice?.normal != null
              ? Number(latestPrice.normal)
              : 0;

        const summary = await this.transactionService.getCostBasis(
            req.user.id,
            cardId,
            isFoil,
            marketPrice
        );

        return ApiResponseDto.ok({
            totalCost: summary.totalCost,
            totalQuantity: summary.totalQuantity,
            averageCost: summary.averageCost,
            unrealizedGain: summary.unrealizedGain,
            realizedGain: summary.realizedGain,
        });
    }

    private toTransactionItem(
        t: Transaction,
        cardMap: Map<string, { name: string; setCode: string }>
    ): TransactionApiItemDto {
        const card = cardMap.get(t.cardId);
        return {
            id: t.id,
            cardId: t.cardId,
            type: t.type,
            quantity: t.quantity,
            pricePerUnit: t.pricePerUnit,
            isFoil: t.isFoil,
            date: TransactionPresenter.formatDate(t.date),
            source: t.source,
            fees: t.fees,
            notes: t.notes,
            cardName: card?.name,
            setCode: card?.setCode,
            editable: TransactionPresenter.isEditable(t.createdAt),
        };
    }

    private async buildCardMap(
        cardIds: string[]
    ): Promise<Map<string, { name: string; setCode: string }>> {
        const cardMap = new Map<string, { name: string; setCode: string }>();
        if (cardIds.length === 0) return cardMap;
        const cards = await this.cardService.findByIds(cardIds);
        for (const card of cards) {
            cardMap.set(card.id, { name: card.name, setCode: card.setCode });
        }
        return cardMap;
    }
}
