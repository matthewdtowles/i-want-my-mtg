import { Controller, Get, Inject, Param, Render, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OptionalAuthGuard } from 'src/http/auth/optional-auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { SealedProductDetailViewDto } from './dto/sealed-product-view.dto';
import { SealedProductOrchestrator } from './sealed-product.orchestrator';

@Controller('sealed-products')
export class SealedProductController {
    private readonly appUrl: string;

    constructor(
        @Inject(SealedProductOrchestrator)
        private readonly orchestrator: SealedProductOrchestrator,
        private readonly configService: ConfigService
    ) {
        this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    }

    @UseGuards(OptionalAuthGuard)
    @Get(':uuid')
    @Render('sealed-product-detail')
    async findByUuid(
        @Param('uuid') uuid: string,
        @Req() req: AuthenticatedRequest
    ): Promise<SealedProductDetailViewDto> {
        const view = await this.orchestrator.findByUuid(req, uuid);
        view.title = `${view.product.name} - I Want My MTG`;
        view.metaDescription = `${view.product.name} sealed product details and pricing.`;
        view.canonicalUrl = `${this.appUrl}/sealed-products/${uuid}`;
        return view;
    }
}
