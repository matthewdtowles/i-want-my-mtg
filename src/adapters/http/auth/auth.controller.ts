import { Controller, Get, Header, Inject, Logger, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { Response  } from 'express';
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
    async login(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        this.LOGGER.debug(`Attempt to authenticate`);
        const authToken: AuthToken = await this.authService.login(req.user);
        if (authToken) {
            res.cookie('auth_token', authToken, {httpOnly: true})
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    }
}