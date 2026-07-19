import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PriceNotificationService } from 'src/core/price-alert/price-notification.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { NotificationPageOrchestrator } from 'src/http/hbs/notification/notification-page.orchestrator';

describe('NotificationPageOrchestrator', () => {
    let orchestrator: NotificationPageOrchestrator;
    let notificationService: jest.Mocked<PriceNotificationService>;

    const authedReq = { user: { id: 7 } } as AuthenticatedRequest;
    const anonReq = { user: null } as unknown as AuthenticatedRequest;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationPageOrchestrator,
                { provide: PriceNotificationService, useValue: { countByUser: jest.fn() } },
            ],
        }).compile();

        orchestrator = module.get(NotificationPageOrchestrator);
        notificationService = module.get(PriceNotificationService);
    });

    beforeEach(() => jest.clearAllMocks());

    it('builds the view with hasNotifications true when the user has some', async () => {
        notificationService.countByUser.mockResolvedValue(2);

        const view = await orchestrator.buildListView(authedReq);

        expect(notificationService.countByUser).toHaveBeenCalledWith(7);
        expect(view.authenticated).toBe(true);
        expect(view.hasNotifications).toBe(true);
        expect(view.title).toBe('Notifications - I Want My MTG');
        expect(view.breadcrumbs).toEqual([
            { label: 'Home', url: '/' },
            { label: 'Notifications', url: '/notifications' },
        ]);
    });

    it('sets hasNotifications false when there are none', async () => {
        notificationService.countByUser.mockResolvedValue(0);

        const view = await orchestrator.buildListView(authedReq);

        expect(view.hasNotifications).toBe(false);
    });

    it('throws Unauthorized for an unauthenticated request', async () => {
        await expect(orchestrator.buildListView(anonReq)).rejects.toThrow(UnauthorizedException);
        expect(notificationService.countByUser).not.toHaveBeenCalled();
    });

    it('maps an unexpected service error to a 500', async () => {
        notificationService.countByUser.mockRejectedValue(new Error('db down'));

        await expect(orchestrator.buildListView(authedReq)).rejects.toThrow(
            InternalServerErrorException
        );
    });
});
