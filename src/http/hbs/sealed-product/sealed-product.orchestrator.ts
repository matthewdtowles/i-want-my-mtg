import { HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';
import { SetService } from 'src/core/set/set.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { Breadcrumb } from 'src/http/base/breadcrumb';
import { isAuthenticated } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { SealedProductDetailViewDto } from './dto/sealed-product-view.dto';
import { SealedProductHbsPresenter } from './sealed-product.presenter';

@Injectable()
export class SealedProductOrchestrator {
    private readonly LOGGER = getLogger(SealedProductOrchestrator.name);

    constructor(
        @Inject(SealedProductService)
        private readonly sealedProductService: SealedProductService,
        @Inject(SetService) private readonly setService: SetService
    ) {}

    async findByUuid(
        req: AuthenticatedRequest,
        uuid: string
    ): Promise<SealedProductDetailViewDto> {
        this.LOGGER.debug(`findByUuid(${uuid})`);
        try {
            const product = await this.sealedProductService.findByUuid(uuid);
            if (!product) {
                throw new NotFoundException('Sealed product not found');
            }

            const set = await this.setService.findByCode(product.setCode);

            let ownedQuantity = 0;
            if (isAuthenticated(req) && req.user?.id) {
                const inventoryItem = await this.sealedProductService.findInventoryItem(
                    uuid,
                    req.user.id
                );
                ownedQuantity = inventoryItem?.quantity ?? 0;
            }

            const row = SealedProductHbsPresenter.toRow(product, ownedQuantity);

            const breadcrumbs: Breadcrumb[] = [
                { label: 'Home', url: '/' },
                { label: 'Sets', url: '/sets' },
                { label: set?.name || product.setCode, url: `/sets/${product.setCode}` },
                { label: product.name, url: `/sealed-products/${uuid}` },
            ];

            return new SealedProductDetailViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs,
                product: row,
                setName: set?.name,
                setKeyruneCode: set?.keyruneCode,
            });
        } catch (error) {
            if (error instanceof HttpException) throw error;
            return HttpErrorHandler.toHttpException(error, 'findSealedProduct');
        }
    }
}
