import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PriceNotificationService } from 'src/core/price-alert/price-notification.service';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { PriceAlertApiPresenter } from 'src/http/api/price-alert/price-alert-api.presenter';
import { McpToolContext, McpToolDefinition } from '../mcp-tool.types';

/** Authenticated notification tools, mirroring `PriceNotificationApiController`. */
@Injectable()
export class NotificationMcpTools {
    constructor(
        @Inject(PriceNotificationService)
        private readonly notificationService: PriceNotificationService
    ) {}

    getTools(): McpToolDefinition[] {
        return [
            {
                name: 'list_notifications',
                description:
                    "List the authenticated user's price alert notifications, newest first. Includes both read and unread. Requires IWMM_API_KEY.",
                inputSchema: z.object({}),
                requiresAuth: true,
                handler: async (_args, ctx) => this.list(ctx),
            },
            {
                name: 'get_unread_notification_count',
                description:
                    'Get the count of unread notifications for the authenticated user. Requires IWMM_API_KEY.',
                inputSchema: z.object({}),
                requiresAuth: true,
                handler: async (_args, ctx) => this.unreadCount(ctx),
            },
            {
                name: 'mark_notification_read',
                description: 'Mark a single notification as read. Requires IWMM_API_KEY.',
                inputSchema: z.object({ id: z.coerce.number().int() }),
                requiresAuth: true,
                handler: async (args, ctx) => this.markRead(args, ctx),
            },
            {
                name: 'mark_all_notifications_read',
                description:
                    'Mark every notification for the authenticated user as read. Requires IWMM_API_KEY.',
                inputSchema: z.object({}),
                requiresAuth: true,
                handler: async (_args, ctx) => this.markAllRead(ctx),
            },
        ];
    }

    private async list(ctx: McpToolContext): Promise<unknown> {
        const [notifications, total] = await Promise.all([
            this.notificationService.findByUserWithCardData(ctx.user.id, 1, 20),
            this.notificationService.countByUser(ctx.user.id),
        ]);
        return ApiResponseDto.ok(
            notifications.map(PriceAlertApiPresenter.toNotificationDto),
            new PaginationMeta(1, 20, total)
        );
    }

    private async unreadCount(ctx: McpToolContext): Promise<unknown> {
        const count = await this.notificationService.countUnreadByUser(ctx.user.id);
        return ApiResponseDto.ok({ count });
    }

    private async markRead(args: { id: number }, ctx: McpToolContext): Promise<unknown> {
        await this.notificationService.markAsRead(args.id, ctx.user.id);
        return ApiResponseDto.ok({ markedRead: true });
    }

    private async markAllRead(ctx: McpToolContext): Promise<unknown> {
        await this.notificationService.markAllAsRead(ctx.user.id);
        return ApiResponseDto.ok({ markedAllRead: true });
    }
}
