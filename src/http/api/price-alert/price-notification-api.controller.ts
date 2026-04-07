import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    NotFoundException,
    Param,
    ParseIntPipe,
    Patch,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DomainNotFoundError } from 'src/core/errors/domain.errors';
import { PriceNotificationService } from 'src/core/price-alert/price-notification.service';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiResponseDto, PaginationMeta } from 'src/http/base/api-response.dto';
import { PriceNotificationApiDto } from './dto/price-notification-response.dto';
import { PriceAlertApiPresenter } from './price-alert-api.presenter';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
export class PriceNotificationApiController {
    constructor(
        @Inject(PriceNotificationService)
        private readonly notificationService: PriceNotificationService
    ) {}

    @Get()
    @ApiOperation({ summary: 'List notifications' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiResponse({ status: 200, description: 'Notification list' })
    async findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<PriceNotificationApiDto[]>> {
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

        const [notifications, total] = await Promise.all([
            this.notificationService.findByUserWithCardData(req.user.id, p, l),
            this.notificationService.countByUser(req.user.id),
        ]);

        return ApiResponseDto.ok(
            notifications.map(PriceAlertApiPresenter.toNotificationDto),
            new PaginationMeta(p, l, total)
        );
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notification count' })
    @ApiResponse({ status: 200, description: 'Unread count' })
    async unreadCount(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ count: number }>> {
        const count = await this.notificationService.countUnreadByUser(req.user.id);
        return ApiResponseDto.ok({ count });
    }

    @Patch(':id/read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark a notification as read' })
    @ApiResponse({ status: 200, description: 'Marked as read' })
    async markAsRead(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ markedRead: boolean }>> {
        try {
            await this.notificationService.markAsRead(id, req.user.id);
            return ApiResponseDto.ok({ markedRead: true });
        } catch (error) {
            if (error instanceof DomainNotFoundError) {
                throw new NotFoundException('Notification not found');
            }
            throw error;
        }
    }

    @Patch('read-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'All marked as read' })
    async markAllAsRead(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ markedAllRead: boolean }>> {
        await this.notificationService.markAllAsRead(req.user.id);
        return ApiResponseDto.ok({ markedAllRead: true });
    }
}
