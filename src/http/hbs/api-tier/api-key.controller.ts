import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { BaseViewDto } from 'src/http/base/base.view.dto';

@Controller('user/api-keys')
export class ApiKeyPageController {
    @UseGuards(JwtAuthGuard)
    @Get()
    @Render('apiKeys')
    page(): BaseViewDto {
        return new BaseViewDto({
            authenticated: true,
            title: 'API Keys',
            metaDescription: 'Manage API keys for programmatic access to your collection.',
        });
    }
}
