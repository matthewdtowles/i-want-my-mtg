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
    Render,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { TransactionApiResponseDto } from './dto/transaction.api-response.dto';
import { TransactionRequestDto } from './dto/transaction.request.dto';
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
    async findByUser(@Req() req: AuthenticatedRequest): Promise<TransactionViewDto> {
        return await this.orchestrator.findByUser(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() dto: TransactionRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<TransactionApiResponseDto> {
        return await this.orchestrator.create(dto, req);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<TransactionApiResponseDto> {
        return await this.orchestrator.delete(id, req);
    }
}
