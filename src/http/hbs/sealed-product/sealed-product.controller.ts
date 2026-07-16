import { Controller, Get, Inject, Param, Render, Req, UseGuards } from '@nestjs/common';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SealedProductDetailViewDto } from './dto/sealed-product-view.dto';
import { SealedProductOrchestrator } from './sealed-product.orchestrator';

@Controller('sealed-products')
export class SealedProductController {
    constructor(
        @Inject(SealedProductOrchestrator)
        private readonly orchestrator: SealedProductOrchestrator
    ) {}

    @UseGuards(OptionalAuthGuard)
    @Get(':uuid')
    @Render('sealed-product-detail')
    async findByUuid(
        @Param('uuid') uuid: string,
        @Req() req: AuthenticatedRequest
    ): Promise<SealedProductDetailViewDto> {
        return this.orchestrator.findByUuid(req, uuid);
    }
}
