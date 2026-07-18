import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SellOptimizerService } from 'src/core/optimizer/sell-optimizer.service';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { JwtOrApiKeyGuard } from '../shared/jwt-or-api-key.guard';
import { OptimizerApiResponseDto } from './dto/optimizer-response.dto';
import { OptimizerApiPresenter } from './optimizer-api.presenter';

@ApiTags('Optimizer')
@ApiBearerAuth()
@Controller('api/v1/optimizer')
@UseGuards(JwtOrApiKeyGuard, ApiRateLimitGuard)
export class SellOptimizerApiController {
    constructor(
        @Inject(SellOptimizerService) private readonly optimizerService: SellOptimizerService
    ) {}

    @Get()
    @ApiOperation({
        operationId: 'getOptimizer',
        summary: 'Cash vs. store-credit recommendation for the sell list vs. the buy list',
        description:
            'Compares the buylist cash payout against store credit (worth a bonus %) applied ' +
            'to the buy list. Mirrors the /optimizer page.',
    })
    @ApiQuery({
        name: 'bonus',
        required: false,
        type: Number,
        description:
            'Store-credit bonus as a fraction (0.30 = +30%). Clamped to [0, 2]; default 0.30.',
    })
    @ApiOkEnvelope(OptimizerApiResponseDto, { description: 'Cash-vs-credit plan' })
    async getOptimizer(
        @Req() req: AuthenticatedRequest,
        @Query('bonus') bonus?: string
    ): Promise<ApiResponseDto<OptimizerApiResponseDto>> {
        const bonusPct = SellOptimizerService.parseBonus(bonus);
        const plan = await this.optimizerService.buildPlan(req.user.id, bonusPct);
        return ApiResponseDto.ok(OptimizerApiPresenter.toResponse(plan));
    }
}
