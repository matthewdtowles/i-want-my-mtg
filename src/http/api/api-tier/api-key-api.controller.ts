import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyService } from 'src/core/api-tier/api-key.service';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import { API_TIER_LIMITS } from 'src/core/api-tier/api-tier-limits';
import { ApiUsageService } from 'src/core/api-tier/api-usage.service';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { CreateApiKeyDto } from './dto/api-key-request.dto';
import { ApiKeyDto, CreatedApiKeyDto } from './dto/api-key-response.dto';
import { ApiKeyApiPresenter } from './api-key-api.presenter';

@ApiTags('API Keys')
@Controller('api/v1/api-keys')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
@ApiBearerAuth()
export class ApiKeyApiController {
    constructor(
        private readonly apiKeyService: ApiKeyService,
        private readonly apiSubscriptionService: ApiSubscriptionService,
        private readonly apiUsageService: ApiUsageService
    ) {}

    @Get('usage')
    @ApiOperation({ summary: 'Get current tier, today usage, and 30-day history' })
    @ApiResponse({ status: 200 })
    async usage(@Req() req: AuthenticatedRequest): Promise<ApiResponseDto<{
        tier: string;
        perDayLimit: number;
        perMinuteLimit: number;
        todayCount: number;
        remainingToday: number;
        history: Array<{ day: string; count: number }>;
    }>> {
        const tier = await this.apiSubscriptionService.getEffectiveTier(req.user.id);
        const limits = API_TIER_LIMITS[tier];
        const today = new Date();
        const fromDay = new Date(today);
        fromDay.setUTCDate(fromDay.getUTCDate() - 29);
        const [todayCount, range] = await Promise.all([
            this.apiUsageService.getCount(req.user.id, today),
            this.apiUsageService.getRange(req.user.id, fromDay, today),
        ]);
        const history = range.map((u) => ({
            day: u.day.toISOString().slice(0, 10),
            count: u.requestCount,
        }));
        return ApiResponseDto.ok({
            tier,
            perDayLimit: limits.perDay,
            perMinuteLimit: limits.perMinute,
            todayCount,
            remainingToday: Math.max(0, limits.perDay - todayCount),
            history,
        });
    }

    @Get()
    @ApiOperation({ summary: 'List API keys for the authenticated user' })
    @ApiOkEnvelope(ApiKeyDto, { isArray: true, description: 'API keys for the user' })
    async findAll(@Req() req: AuthenticatedRequest): Promise<ApiResponseDto<ApiKeyDto[]>> {
        const keys = await this.apiKeyService.listForUser(req.user.id);
        return ApiResponseDto.ok(keys.map(ApiKeyApiPresenter.toDto));
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new API key. Raw key is returned once.' })
    @ApiOkEnvelope(CreatedApiKeyDto, { status: 201, description: 'Created API key (raw key shown once)' })
    async create(
        @Body() dto: CreateApiKeyDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<CreatedApiKeyDto>> {
        try {
            const { apiKey, rawKey } = await this.apiKeyService.create(req.user.id, dto.name);
            return ApiResponseDto.okWithMessage(
                ApiKeyApiPresenter.toCreatedDto(apiKey, rawKey),
                'Save this key now — it will not be shown again.'
            );
        } catch (err) {
            if (err instanceof DomainValidationError) throw new BadRequestException(err.message);
            throw err;
        }
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke an API key' })
    @ApiResponse({ status: 204 })
    async revoke(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<void> {
        try {
            await this.apiKeyService.revoke(req.user.id, id);
        } catch (err) {
            // Map authorization errors to 404 to avoid leaking the existence of other users' keys.
            if (err instanceof DomainNotFoundError || err instanceof DomainNotAuthorizedError) {
                throw new NotFoundException(`API key ${id} not found`);
            }
            throw err;
        }
    }
}
