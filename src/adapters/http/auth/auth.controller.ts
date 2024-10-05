import { Controller, Get, Inject, Logger, Post, Render, Request, UseGuards } from '@nestjs/common';
import { AuthToken } from 'src/core/auth/auth.types';
import { AuthServicePort } from 'src/core/auth/ports/auth.service.port';
import { AuthenticatedRequest } from './authenticated.request';
import { LocalAuthGuard } from './local.auth.guard';

@Controller('auth')
export class AuthController {

    private readonly LOGGER: Logger = new Logger(AuthController.name);

    constructor(@Inject(AuthServicePort) private readonly authService: AuthServicePort) { }

    @Get('login')
    @Render('login')
    async loginForm() {
        this.LOGGER.debug(`login form called`);
        return {};
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req: AuthenticatedRequest): Promise<AuthToken> {
        return await this.authService.login(req.user);
    }
}