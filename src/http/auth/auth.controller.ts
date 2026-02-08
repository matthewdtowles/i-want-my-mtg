import { Controller, Get, Inject, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { getLogger } from 'src/logger/global-app-logger';
import { getAuthCookieOptions } from './auth.cookie.util';
import { AuthOrchestrator } from './auth.orchestrator';
import { AuthResult } from './dto/auth.result';
import { AUTH_TOKEN_NAME } from './dto/auth.types';
import { LoginFormViewDto } from './dto/login-form.view.dto';
import { LocalAuthGuard } from './local.auth.guard';

@Controller('auth')
export class AuthController {
    private readonly LOGGER = getLogger(AuthController.name);

    constructor(
        @Inject(AuthOrchestrator) private readonly authOrchestrator: AuthOrchestrator,
        private readonly configService: ConfigService
    ) {}

    @Get('login')
    @Render('login')
    async loginForm(): Promise<LoginFormViewDto> {
        this.LOGGER.log(`Fetch login form.`);
        return new LoginFormViewDto();
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const userId = req?.user?.id;
        this.LOGGER.log(`Login attempt for user ${userId ?? '""'}.`);
        const result: AuthResult = await this.authOrchestrator.login(req?.user);
        if (result.success && result.token) {
            res.cookie(AUTH_TOKEN_NAME, result.token, getAuthCookieOptions(this.configService));
            res.redirect('/user');
            this.LOGGER.log(`Login successful for user ${userId}.`);
        } else {
            res.redirect('/auth/login?error=Invalid credentials');
            this.LOGGER.warn(`Login failed for user ${userId}.`);
        }
    }

    @Get('logout')
    async logout(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const userId = req?.user?.id;
        this.LOGGER.log(`Logging out user ${userId ?? '""'}...`);
        const result = await this.authOrchestrator.logout();
        res.clearCookie(AUTH_TOKEN_NAME);
        res.redirect(result.redirectTo);
        this.LOGGER.log(`Logged out user ${userId ?? '""'}.`);
    }

    private getCookieOptions() {
        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
        return {
            httpOnly: true,
            sameSite: 'strict' as const,
            secure: isProduction,
            maxAge: 3600000,
            path: '/',
        };
    }
}
