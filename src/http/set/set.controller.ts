import { Controller, Get, Inject, Param, Query, Render, Req, UseGuards } from '@nestjs/common';
import { safeBoolean, safeSort } from 'src/core/query/query.util';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SetListViewDto } from './dto/set-list.view.dto';
import { SetViewDto } from './dto/set.view.dto';
import { SetOrchestrator } from './set.orchestrator';

@Controller('sets')
export class SetController {
    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) {}

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render('setListPage')
    async findAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('filter') filter: string,
        @Query('sort') sort: string,
        @Query('ascend') ascend: string,
        @Query('baseOnly') baseOnly: string,
        @Req() req: AuthenticatedRequest
    ): Promise<SetListViewDto> {
        const options = new SafeQueryOptions({
            page: parseInt(page),
            limit: parseInt(limit),
            filter,
            sort: safeSort(sort),
            ascend: ascend === 'true',
            baseOnly: safeBoolean(baseOnly),
        });
        return await this.setOrchestrator.findSetList(
            req,
            [
                { label: 'Home', url: '/' },
                { label: 'Sets', url: '/sets' },
            ],
            options
        );
    }

    @UseGuards(OptionalAuthGuard)
    @Get(':code')
    @Render('set')
    async findByCode(
        @Param('code') code: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('filter') filter: string,
        @Query('sort') sort: string,
        @Query('ascend') ascend: string,
        @Query('baseOnly') baseOnly: string,
        @Req() req: AuthenticatedRequest
    ): Promise<SetViewDto> {
        const options = new SafeQueryOptions({
            page: parseInt(page),
            limit: parseInt(limit),
            filter,
            sort: safeSort(sort),
            ascend: ascend === 'true',
            baseOnly: safeBoolean(baseOnly),
        });
        return await this.setOrchestrator.findBySetCode(req, code, options);
    }
}
