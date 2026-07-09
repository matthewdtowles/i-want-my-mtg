import { Inject, Injectable } from '@nestjs/common';
import { BuyListService } from 'src/core/buy-list/buy-list.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { BuyListViewDto } from './dto/buy-list.view.dto';

@Injectable()
export class BuyListPageOrchestrator {
    private readonly LOGGER = getLogger(BuyListPageOrchestrator.name);

    constructor(@Inject(BuyListService) private readonly buyListService: BuyListService) {
        this.LOGGER.debug('Initialized');
    }

    async buildListView(req: AuthenticatedRequest): Promise<BuyListViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const count = await this.buyListService.count(req.user.id);

            return new BuyListViewDto({
                authenticated: true,
                hasItems: count > 0,
                title: 'Buy List - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Buy List', url: '/buy-list' },
                ],
            });
        } catch (error) {
            this.LOGGER.debug(`Error building buy-list view: ${error?.message}`);
            HttpErrorHandler.toHttpException(error, 'buildListView');
        }
    }
}
