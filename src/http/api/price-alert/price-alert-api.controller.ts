import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Inject,
    InternalServerErrorException,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';
import { PriceAlert } from 'src/core/price-alert/price-alert.entity';
import { PriceAlertService } from 'src/core/price-alert/price-alert.service';
import { getLogger } from 'src/logger/global-app-logger';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { CreatePriceAlertDto, UpdatePriceAlertDto } from './dto/price-alert-request.dto';
import { PriceAlertApiDto } from './dto/price-alert-response.dto';
import { PriceAlertApiPresenter } from './price-alert-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

@ApiTags('Price Alerts')
@Controller('api/v1/price-alerts')
export class PriceAlertApiController {
    private readonly LOGGER = getLogger(PriceAlertApiController.name);

    constructor(
        @Inject(PriceAlertService) private readonly priceAlertService: PriceAlertService,
        private readonly configService: ConfigService
    ) {}

    @Get()
    @UseGuards(JwtAuthGuard, ApiRateLimitGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List price alerts' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiResponse({ status: 200, description: 'Price alert list' })
    async findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<PriceAlertApiDto[]>> {
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

        const [alerts, total] = await Promise.all([
            this.priceAlertService.findByUserWithCardData(req.user.id, p, l),
            this.priceAlertService.countByUser(req.user.id),
        ]);

        return ApiResponseDto.ok(
            alerts.map(PriceAlertApiPresenter.toAlertWithCardDto),
            new PaginationMeta(p, l, total)
        );
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard, ApiRateLimitGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a price alert' })
    @ApiResponse({ status: 201, description: 'Alert created' })
    async create(
        @Body() dto: CreatePriceAlertDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<PriceAlertApiDto>> {
        if (dto.increasePct == null && dto.decreasePct == null) {
            throw new BadRequestException(
                'At least one threshold (increasePct or decreasePct) is required'
            );
        }
        try {
            const alert = await this.priceAlertService.create(
                new PriceAlert({
                    userId: req.user.id,
                    cardId: dto.cardId,
                    increasePct: dto.increasePct,
                    decreasePct: dto.decreasePct,
                })
            );
            return ApiResponseDto.ok(PriceAlertApiPresenter.toAlertDto(alert));
        } catch (error) {
            if (error instanceof DomainValidationError) {
                throw new BadRequestException(error.message);
            }
            this.LOGGER.error(`Unexpected error creating price alert: ${error?.message ?? error}`);
            throw new InternalServerErrorException('Failed to create price alert');
        }
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, ApiRateLimitGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a price alert' })
    @ApiResponse({ status: 200, description: 'Alert updated' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePriceAlertDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<PriceAlertApiDto>> {
        try {
            const alert = await this.priceAlertService.update(id, req.user.id, dto);
            return ApiResponseDto.ok(PriceAlertApiPresenter.toAlertDto(alert));
        } catch (error) {
            if (error instanceof DomainNotFoundError || error instanceof DomainNotAuthorizedError) {
                throw new NotFoundException('Price alert not found');
            }
            if (error instanceof DomainValidationError) {
                throw new BadRequestException(error.message);
            }
            this.LOGGER.error(`Unexpected error updating price alert ${id}: ${error?.message ?? error}`);
            throw new InternalServerErrorException('Failed to update price alert');
        }
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard, ApiRateLimitGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a price alert' })
    @ApiResponse({ status: 200, description: 'Alert deleted' })
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        try {
            await this.priceAlertService.delete(id, req.user.id);
            return ApiResponseDto.ok({ deleted: true });
        } catch (error) {
            if (error instanceof DomainNotFoundError || error instanceof DomainNotAuthorizedError) {
                throw new NotFoundException('Price alert not found');
            }
            this.LOGGER.error(`Unexpected error deleting price alert ${id}: ${error?.message ?? error}`);
            throw new InternalServerErrorException('Failed to delete price alert');
        }
    }

    @Post('process')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Process price alerts (internal, called by cron)' })
    @ApiResponse({ status: 200, description: 'Processing result' })
    async process(
        @Headers('x-api-key') apiKey: string
    ): Promise<ApiResponseDto<{ notificationsSent: number; usersNotified: number }>> {
        const expectedKey = this.configService.get<string>('INTERNAL_API_KEY');
        if (!expectedKey || apiKey !== expectedKey) {
            throw new UnauthorizedException('Invalid API key');
        }
        const result = await this.priceAlertService.processAlerts();
        return ApiResponseDto.ok(result);
    }
}
