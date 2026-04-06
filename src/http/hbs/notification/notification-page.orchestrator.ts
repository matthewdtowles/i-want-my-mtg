import { Inject, Injectable } from '@nestjs/common';
import { PriceNotificationService } from 'src/core/price-alert/price-notification.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { HttpErrorHandler } from 'src/http/http.error.handler';
import { getLogger } from 'src/logger/global-app-logger';
import { NotificationListViewDto } from './dto/notification-list.view.dto';

@Injectable()
export class NotificationPageOrchestrator {
    private readonly LOGGER = getLogger(NotificationPageOrchestrator.name);

    constructor(
        @Inject(PriceNotificationService)
        private readonly notificationService: PriceNotificationService
    ) {
        this.LOGGER.debug('Initialized');
    }

    async buildListView(req: AuthenticatedRequest): Promise<NotificationListViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const count = await this.notificationService.countByUser(req.user.id);

            return new NotificationListViewDto({
                authenticated: true,
                hasNotifications: count > 0,
                title: 'Notifications - I Want My MTG',
                breadcrumbs: [
                    { label: 'Home', url: '/' },
                    { label: 'Notifications', url: '/notifications' },
                ],
            });
        } catch (error) {
            this.LOGGER.debug(`Error building notification list: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, 'buildListView');
        }
    }
}
