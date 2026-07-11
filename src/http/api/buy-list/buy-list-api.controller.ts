import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BuyListService } from 'src/core/buy-list/buy-list.service';
import { parseCardImport } from 'src/core/import/parsers/card-import-dispatch';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { JwtOrApiKeyGuard } from '../shared/jwt-or-api-key.guard';
import { BuyListApiPresenter } from './buy-list-api.presenter';
import { AdjustedQuantityApiDto } from '../shared/adjusted-quantity.dto';
import {
    BuyListAddApiDto,
    BuyListAdjustApiDto,
    BuyListImportApiDto,
    BuyListRemoveApiDto,
    BuyListSetQuantityApiDto,
} from './dto/buy-list-request-api.dto';
import { BuyListImportResponseDto, BuyListItemApiDto } from './dto/buy-list-response.dto';

@ApiTags('Buy List')
@ApiBearerAuth()
@Controller('api/v1/buy-list')
@UseGuards(JwtOrApiKeyGuard, ApiRateLimitGuard)
export class BuyListApiController {
    constructor(@Inject(BuyListService) private readonly buyListService: BuyListService) {}

    @Get()
    @ApiOperation({ summary: "List the authenticated user's buy-list" })
    @ApiOkEnvelope(BuyListItemApiDto, { isArray: true, description: 'Buy-list items' })
    async list(@Req() req: AuthenticatedRequest): Promise<ApiResponseDto<BuyListItemApiDto[]>> {
        const items = await this.buyListService.list(req.user.id);
        return ApiResponseDto.ok(items.map((i) => BuyListApiPresenter.toItem(i)));
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Add a card to the buy-list (increments quantity)' })
    @ApiResponse({ status: 200, description: 'Added' })
    async add(
        @Body() dto: BuyListAddApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ added: boolean }>> {
        await this.buyListService.add(
            req.user.id,
            dto.cardId,
            dto.isFoil ?? false,
            dto.quantity ?? 1
        );
        return ApiResponseDto.ok({ added: true });
    }

    @Patch()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Set the absolute quantity for a buy-list item (0 removes it)' })
    @ApiResponse({ status: 200, description: 'Updated' })
    async setQuantity(
        @Body() dto: BuyListSetQuantityApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ updated: boolean }>> {
        await this.buyListService.setQuantity(req.user.id, dto.cardId, dto.isFoil, dto.quantity);
        return ApiResponseDto.ok({ updated: true });
    }

    @Patch('adjust')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        operationId: 'adjustBuyListQuantity',
        summary: "Adjust a buy-list item's quantity by a delta",
        description:
            'Atomically adds `delta` (negative to subtract) to the quantity for ' +
            '(card, finish), creating the row for a positive delta and removing it ' +
            'when the result is 0 or less. Safe under concurrent calls, unlike ' +
            'read-modify-write against the absolute-quantity PATCH.',
    })
    @ApiOkEnvelope(AdjustedQuantityApiDto, { description: 'Quantity after the adjustment' })
    async adjust(
        @Body() dto: BuyListAdjustApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<AdjustedQuantityApiDto>> {
        const quantity = await this.buyListService.adjust(
            req.user.id,
            dto.cardId,
            dto.isFoil,
            dto.delta
        );
        return ApiResponseDto.ok({ cardId: dto.cardId, isFoil: dto.isFoil, quantity });
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove a card from the buy-list' })
    @ApiResponse({ status: 200, description: 'Removed' })
    async remove(
        @Body() dto: BuyListRemoveApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        await this.buyListService.remove(req.user.id, dto.cardId, dto.isFoil);
        return ApiResponseDto.ok({ deleted: true });
    }

    @Post('import')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Bulk-add cards to the buy-list from pasted CSV text',
        description:
            'Paste CSV rows with a header (name,set_code,number[,quantity][,foil]) — the same ' +
            'native format as inventory import; external exports (Moxfield, Archidekt, Deckbox, ' +
            'TCGPlayer) are auto-detected. Returns counts and per-row errors.',
    })
    @ApiOkEnvelope(BuyListImportResponseDto, { description: 'Import result' })
    @ApiResponse({ status: 400, description: 'Invalid CSV text' })
    async import(
        @Body() dto: BuyListImportApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<BuyListImportResponseDto>> {
        let rows: ReturnType<typeof parseCardImport>['rows'];
        try {
            ({ rows } = parseCardImport(Buffer.from(dto.text ?? '')));
        } catch (err) {
            throw new BadRequestException(err instanceof Error ? err.message : 'Invalid CSV text');
        }
        const result = await this.buyListService.bulkAdd(rows, req.user.id);
        return ApiResponseDto.ok(
            new BuyListImportResponseDto({
                saved: result.saved,
                errors: result.errors.map((e) => ({
                    row: e.row,
                    name: typeof e.name === 'string' ? e.name : undefined,
                    error: e.error,
                })),
            })
        );
    }
}
