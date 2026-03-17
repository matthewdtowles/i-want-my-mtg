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
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CardService } from 'src/core/card/card.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { TransactionPresenter } from 'src/http/hbs/transaction/transaction.presenter';
import { TransactionRequestDto } from 'src/http/hbs/transaction/dto/transaction.request.dto';
import { TransactionUpdateRequestDto } from 'src/http/hbs/transaction/dto/transaction.update-request.dto';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { CostBasisApiDto, TransactionApiItemDto } from './dto/transaction-response.dto';
import { TransactionApiPresenter } from './transaction-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('api/v1/transactions')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
export class TransactionApiController {
    constructor(
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(CardService) private readonly cardService: CardService
    ) {}

    @Get()
    @ApiOperation({ summary: 'List all transactions' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'ascend', required: false })
    @ApiQuery({ name: 'filter', required: false })
    @ApiResponse({ status: 200, description: 'Transaction list' })
    async findAll(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<TransactionApiItemDto[]>> {
        const options = new SafeQueryOptions(query);
        const [transactions, total] = await Promise.all([
            this.transactionService.findByUserPaginated(req.user.id, options),
            this.transactionService.countByUser(req.user.id, options),
        ]);

        return ApiResponseDto.ok(
            transactions.map((t) => TransactionApiPresenter.toTransactionItem(t)),
            new PaginationMeta(options.page, options.limit, total)
        );
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
        return ApiResponseDto.ok(TransactionApiPresenter.toTransactionItem(saved));
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
        return ApiResponseDto.ok(TransactionApiPresenter.toTransactionItem(updated));
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
    @ApiOperation({ summary: 'Get cost basis for a card by ID' })
    @ApiQuery({ name: 'isFoil', required: false, description: 'Whether to check foil version' })
    @ApiResponse({ status: 200, description: 'Cost basis data' })
    async getCostBasisById(
        @Param('cardId') cardId: string,
        @Query('isFoil') isFoilStr: string,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<CostBasisApiDto>> {
        return this.getCostBasisForCard(cardId, isFoilStr, req);
    }

    @Get('cost-basis/:setCode/:setNumber')
    @ApiOperation({ summary: 'Get cost basis for a card by set code and number' })
    @ApiQuery({ name: 'isFoil', required: false, description: 'Whether to check foil version' })
    @ApiResponse({ status: 200, description: 'Cost basis data' })
    @ApiResponse({ status: 404, description: 'Card not found' })
    async getCostBasisBySetCodeAndNumber(
        @Param('setCode') setCode: string,
        @Param('setNumber') setNumber: string,
        @Query('isFoil') isFoilStr: string,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<CostBasisApiDto>> {
        const card = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
        if (!card) {
            throw new NotFoundException('Card not found');
        }
        return this.getCostBasisForCard(card.id, isFoilStr, req);
    }

    private async getCostBasisForCard(
        cardId: string,
        isFoilStr: string,
        req: AuthenticatedRequest
    ): Promise<ApiResponseDto<CostBasisApiDto>> {
        const isFoil = isFoilStr === 'true';

        const cards = await this.cardService.findByIdsWithPrices([cardId]);
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
}
