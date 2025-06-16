import {
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Post,
    Render,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { AUTH_TOKEN_NAME, AuthenticatedRequest } from "./auth.types";
import { LocalAuthGuard } from "./local.auth.guard";
import { AuthService } from "src/core/auth/auth.service";
import { AuthToken } from "src/core/auth/auth.types";
import { User } from "src/core/user/user.entity";
import { UserRole } from "src/shared/constants/user.role.enum";
import { UserResponseDto } from "src/adapters/http/user/dto/user.response.dto";

@Controller("auth")
export class AuthController {
    private readonly LOGGER: Logger = new Logger(AuthController.name);

    constructor(@Inject(AuthService) private readonly authService: AuthService) { }

    @Get("login")
    @Render("login")
    async loginForm() {
        this.LOGGER.debug(`login form called`);
        return {};
    }

    @UseGuards(LocalAuthGuard)
    @Post("login")
    async login(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        this.LOGGER.debug(`Attempt to authenticate ${JSON.stringify(req.user)}`);
        const user: UserResponseDto = req.user;
        if (!user || !user.id) {
            this.LOGGER.error(`User not found`);
            res.redirect(`/login?action=login&status=${HttpStatus.UNAUTHORIZED}`);
        }
        const coreUser: User = new User({
            id: user.id,
            email: user.email,
            name: user.name,
            role: UserRole[user.role as keyof typeof UserRole] || UserRole.User
        });
        const authToken: AuthToken = await this.authService.login(coreUser);
        if (!authToken || !authToken.access_token) {
            this.LOGGER.error(`Login failed`);
            res.redirect(`/login?action=login&status=${HttpStatus.UNAUTHORIZED}`);
        }
        this.LOGGER.log(`${user.name} logged in`);
        res
            .cookie(AUTH_TOKEN_NAME, authToken.access_token, {
                httpOnly: true,
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production",
                maxAge: 3600000,
            })
            .redirect(`/user?action=login&status=${HttpStatus.OK}`);
    }

    @Get("logout")
    async logout(@Res() res: Response): Promise<void> {
        this.LOGGER.debug(`Logging out user`);
        res.clearCookie(AUTH_TOKEN_NAME);
        res.redirect(`/?action=logout&status=${HttpStatus.OK}&message=Logged%20out`);
    }
}
