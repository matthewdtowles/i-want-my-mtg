import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpStatus,
    Inject,
    Param,
    Post,
    Query,
    Redirect,
    Render,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SetListViewDto } from './dto/set-list.view.dto';
import { SetPriceHistoryResponseDto } from './dto/set-price-history-response.dto';
import { SetViewDto } from './dto/set.view.dto';
import { SetOrchestrator } from './set.orchestrator';
import { Response } from 'express';

/** Allowlist for set codes used in Content-Disposition filename headers. */
const SAFE_SET_CODE_RE = /^[A-Za-z0-9_-]+$/;

@Controller('sets')
export class SetController {
    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) {}

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('setListPage')
    async findAll(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<SetListViewDto> {
        const options = new SafeQueryOptions(query);
        const view = await this.setOrchestrator.findSetList(
            req,
            [
                { label: 'Home', url: '/' },
                { label: 'Sets', url: '/sets' },
            ],
            options
        );
        view.title = 'Sets — I Want My MTG';
        view.metaDescription = 'Browse all Magic: The Gathering sets with prices, card lists, and collection tracking.';
        view.indexable = true;
        return view;
    }

    @UseGuards(JwtAuthGuard)
    @Post(':code/inventory')
    @Redirect()
    async addSetToInventory(
        @Param('code') code: string,
        @Body() body: { foil?: string; include_variants?: string },
        @Req() req: AuthenticatedRequest
    ) {
        const foil = body.foil === 'true' || body.foil === '1';
        const includeVariants = body.include_variants === 'true' || body.include_variants === '1';
        await this.setOrchestrator.addSetToInventory(req, code, foil, includeVariants);
        return { url: `/sets/${code}`, statusCode: HttpStatus.FOUND };
    }

    @Get(':code/price-history')
    async getPriceHistory(
        @Param('code') code: string,
        @Query('days') days?: string
    ): Promise<SetPriceHistoryResponseDto> {
        const parsedDays = days ? parseInt(days, 10) : undefined;
        return this.setOrchestrator.getSetPriceHistory(
            code,
            Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : undefined
        );
    }

    @UseGuards(OptionalAuthGuard)
    @Get(':code/checklist')
    async getChecklist(
        @Param('code') code: string,
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        if (!SAFE_SET_CODE_RE.test(code)) {
            throw new BadRequestException(`Invalid set code: "${code}"`);
        }
        const userId = req.user?.id ?? null;
        const csv = await this.setOrchestrator.getChecklist(code, userId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${code}-checklist.csv"`);
        res.send(csv);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(':code')
    @Render('set')
    async findByCode(
        @Param('code') code: string,
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<SetViewDto> {
        const options = new SafeQueryOptions(query);
        const view = await this.setOrchestrator.findBySetCode(req, code, options);
        view.title = `${view.set?.name || code.toUpperCase()} — I Want My MTG`;
        view.metaDescription = `View cards, prices, and collection stats for ${view.set?.name || code.toUpperCase()}.`;
        view.indexable = true;
        return view;
    }
}
