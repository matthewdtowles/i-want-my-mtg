import { Body, Controller, Get, Inject, Post, Query, Render, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { getLogger } from 'src/logger/global-app-logger';
import { getAuthCookieOptions } from './auth.cookie.util';
import { AuthOrchestrator } from './auth.orchestrator';
import { AuthResult } from './dto/auth.result';
import { AUTH_TOKEN_NAME } from './dto/auth.types';
import { ForgotPasswordRequestDto } from './dto/forgot-password.request.dto';
import { LoginFormViewDto } from './dto/login-form.view.dto';
import { ResetPasswordRequestDto } from './dto/reset-password.request.dto';
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

    @Get('forgot-password')
    @Render('forgotPassword')
    async forgotPasswordForm(): Promise<Record<string, never>> {
        this.LOGGER.log(`Fetch forgot password form.`);
        return {};
    }

    @Post('forgot-password')
    async forgotPassword(
        @Body() forgotPasswordDto: ForgotPasswordRequestDto,
        @Res() res: Response
    ): Promise<void> {
        this.LOGGER.log(`Password reset request for email: ${forgotPasswordDto.email}.`);
        const result = await this.authOrchestrator.requestPasswordReset(forgotPasswordDto.email);
        res.render('resetRequestSent', { message: result.message });
    }

    @Get('reset-password')
    async resetPasswordForm(@Query('token') token: string, @Res() res: Response): Promise<void> {
        this.LOGGER.log(`Fetch reset password form.`);
        if (!token) {
            res.render('resetPasswordResult', {
                success: false,
                message: 'Invalid reset link.',
            });
            return;
        }
        res.render('resetPassword', { token });
    }

    @Post('reset-password')
    async resetPassword(
        @Body() resetPasswordDto: ResetPasswordRequestDto,
        @Res() res: Response
    ): Promise<void> {
        this.LOGGER.log(`Password reset attempt.`);

        if (resetPasswordDto.password !== resetPasswordDto.confirmPassword) {
            res.render('resetPassword', {
                token: resetPasswordDto.token,
                error: 'Passwords do not match.',
            });
            return;
        }

        const result = await this.authOrchestrator.resetPassword(
            resetPasswordDto.token,
            resetPasswordDto.password
        );

        if (result.success && result.token) {
            res.cookie(AUTH_TOKEN_NAME, result.token, getAuthCookieOptions(this.configService));
            res.redirect('/user');
        } else {
            res.render('resetPasswordResult', {
                success: false,
                message: result.message,
            });
        }
    }
}
