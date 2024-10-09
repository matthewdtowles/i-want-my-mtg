import { Controller, Get, HttpStatus, Inject, Logger, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthToken } from 'src/core/auth/auth.types';
import { AuthServicePort } from 'src/core/auth/ports/auth.service.port';
import { AuthenticatedRequest } from './authenticated.request';
import { LocalAuthGuard } from './local.auth.guard';
import { UserDto } from 'src/core/user/dto/user.dto';

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
        const user: UserDto = req.user;
        if (!user || !user.id) {
            this.LOGGER.error(`User not found`);
            res.redirect(HttpStatus.UNAUTHORIZED, '/login?action=login&status=401');
        }
        const authToken: AuthToken = await this.authService.login(req.user);
        if (!authToken) {
            this.LOGGER.error(`Login failed`);
            res.redirect(HttpStatus.UNAUTHORIZED, '/login?action=login&status=401');
        }
        this.LOGGER.debug(`${user.name} logged in`);
        res.cookie('Authorization', authToken.access_token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000
        }).status(HttpStatus.OK).redirect(`/user/${user.id}?action=login&status=200`);
    }

    // TODO: IMPL
    async logout() {}
}