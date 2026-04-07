import { Controller, Get, Inject, Render, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { NotificationListViewDto } from './dto/notification-list.view.dto';
import { NotificationPageOrchestrator } from './notification-page.orchestrator';

@Controller('notifications')
export class NotificationPageController {
    constructor(
        @Inject(NotificationPageOrchestrator)
        private readonly orchestrator: NotificationPageOrchestrator
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('notifications')
    async list(@Req() req: AuthenticatedRequest): Promise<NotificationListViewDto> {
        return await this.orchestrator.buildListView(req);
    }
}
