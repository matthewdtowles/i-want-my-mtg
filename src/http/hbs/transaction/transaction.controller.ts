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
    Render,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { TransactionRequestDto } from './dto/transaction.request.dto';
import { TransactionUpdateRequestDto } from './dto/transaction.update-request.dto';
import { TransactionViewDto } from './dto/transaction.view.dto';
import { TransactionOrchestrator } from './transaction.orchestrator';

@Controller('transactions')
export class TransactionController {
    constructor(
        @Inject(TransactionOrchestrator)
        private readonly orchestrator: TransactionOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('transactions')
    async findByUser(
        @Query() query: Record<string, string>,
        @Req() req: AuthenticatedRequest
    ): Promise<TransactionViewDto> {
        const options = new SafeQueryOptions(query);
        return await this.orchestrator.findByUser(req, options);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() dto: TransactionRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<Record<string, unknown> | null>> {
        return await this.orchestrator.create(dto, req);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: TransactionUpdateRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<Record<string, unknown> | null>> {
        return await this.orchestrator.update(id, dto, req);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<Record<string, unknown> | null>> {
        return await this.orchestrator.delete(id, req);
    }

    @UseGuards(JwtAuthGuard)
    @Get('export')
    async exportCsv(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const csv = await this.orchestrator.exportCsv(req);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.send(csv);
    }
}
