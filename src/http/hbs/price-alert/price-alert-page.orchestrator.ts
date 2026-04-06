import { Inject, Injectable } from '@nestjs/common';
import { PriceAlertService } from 'src/core/price-alert/price-alert.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { PriceAlertListViewDto } from './dto/price-alert-list.view.dto';

@Injectable()
export class PriceAlertPageOrchestrator {
    private readonly LOGGER = getLogger(PriceAlertPageOrchestrator.name);

    constructor(
        @Inject(PriceAlertService) private readonly priceAlertService: PriceAlertService
    ) {
        this.LOGGER.debug('Initialized');
    }

    async buildListView(req: AuthenticatedRequest): Promise<PriceAlertListViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const count = await this.priceAlertService.countByUser(req.user.id);

            return new PriceAlertListViewDto({
                authenticated: true,
                hasAlerts: count > 0,
                title: 'Price Alerts - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Price Alerts', url: '/price-alerts' },
                ],
            });
        } catch (error) {
            this.LOGGER.debug(`Error building price alert list: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildListView');
        }
    }
}
