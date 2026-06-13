import {
    Controller,
    Get,
    Header,
    Inject,
    Query,
    Render,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { OptimizerViewDto } from './dto/optimizer.view.dto';
import { SellOptimizerOrchestrator } from './sell-optimizer.orchestrator';

@Controller('optimizer')
export class SellOptimizerController {
    constructor(
        @Inject(SellOptimizerOrchestrator)
        private readonly orchestrator: SellOptimizerOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('optimizer')
    async view(
        @Req() req: AuthenticatedRequest,
        @Query('bonus') bonus?: string
    ): Promise<OptimizerViewDto> {
        return await this.orchestrator.buildView(req, bonus);
    }

    @UseGuards(JwtAuthGuard)
    @Get('export.csv')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="cash-vs-credit-plan.csv"')
    async exportCsv(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response,
        @Query('bonus') bonus?: string
    ): Promise<void> {
        const csv = await this.orchestrator.buildCsv(req, bonus);
        res.send(csv);
    }
}
