import { Inject, Injectable } from '@nestjs/common';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';
import { SetService } from 'src/core/set/set.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { Breadcrumb } from 'src/http/base/breadcrumb';
import { isAuthenticated, toDollar } from 'src/http/base/http.util';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import {
    SealedProductDetailViewDto,
    SealedProductResponseDto,
} from './dto/sealed-product-view.dto';

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
                return new SealedProductDetailViewDto({
                    authenticated: isAuthenticated(req),
                    breadcrumbs: [
                        { label: 'Home', url: '/' },
                        { label: 'Sealed Product', url: '#' },
                    ],
                    product: null,
                });
            }

            const set = await this.setService.findByCode(product.setCode);

            let inventoryQuantity = 0;
            if (isAuthenticated(req) && req.user?.id) {
                const inventoryItem = await this.sealedProductService.findInventoryItem(
                    uuid,
                    req.user.id
                );
                inventoryQuantity = inventoryItem?.quantity ?? 0;
            }

            const dto: SealedProductResponseDto = {
                uuid: product.uuid,
                name: product.name,
                setCode: product.setCode,
                category: product.category,
                subtype: product.subtype,
                cardCount: product.cardCount,
                productSize: product.productSize,
                releaseDate: product.releaseDate,
                contentsSummary: product.contentsSummary,
                purchaseUrlTcgplayer: product.purchaseUrlTcgplayer,
                price: product.price?.price != null ? toDollar(product.price.price) : undefined,
                priceChangeWeekly:
                    product.price?.priceChangeWeekly != null
                        ? toDollar(product.price.priceChangeWeekly)
                        : undefined,
            };

            const breadcrumbs: Breadcrumb[] = [
                { label: 'Home', url: '/' },
                { label: 'Sets', url: '/sets' },
                { label: set?.name || product.setCode, url: `/sets/${product.setCode}` },
                { label: product.name, url: `/sealed-products/${uuid}` },
            ];

            return new SealedProductDetailViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs,
                product: dto,
                setName: set?.name,
                setKeyruneCode: set?.keyruneCode,
                inventoryQuantity,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, 'findSealedProduct');
        }
    }
}
