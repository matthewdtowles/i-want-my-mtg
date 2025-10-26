import {
    Controller,
    Get, Inject,
    Post,
    Render,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { getLogger } from "src/logger/global-app-logger";
import { AuthOrchestrator } from "./auth.orchestrator";
import { AuthResult } from "./dto/auth.result";
import { AUTH_TOKEN_NAME } from "./dto/auth.types";
import { LoginFormViewDto } from "./dto/login-form.view.dto";
import { LocalAuthGuard } from "./local.auth.guard";

@Controller("auth")
export class AuthController {

    private readonly LOGGER = getLogger(AuthController.name);

    constructor(@Inject(AuthOrchestrator) private readonly authOrchestrator: AuthOrchestrator) { }

    @Get("login")
    @Render("login")
    async loginForm(): Promise<LoginFormViewDto> {
        this.LOGGER.log(`Fetch login form.`);
        return new LoginFormViewDto();
    }

    @UseGuards(LocalAuthGuard)
    @Post("login")
    async login(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const userId = req?.user?.id;
        this.LOGGER.log(`Login attempt for user ${userId ?? "\"\""}.`);
        const result: AuthResult = await this.authOrchestrator.login(req?.user);
        if (result.success && result.token) {
            res.cookie(AUTH_TOKEN_NAME, result.token, {
                httpOnly: true,
                sameSite: "strict",
                secure: false,
                maxAge: 3600000,
                path: "/",
                domain: undefined,
            });
            res.redirect("/user");
            this.LOGGER.log(`Login successful for user ${userId}.`);
        } else {
            // TODO: remove the query param for error in favor of flash messages ??
            res.redirect("/auth/login?error=Invalid credentials");
            this.LOGGER.warn(`Login failed for user ${userId}.`);
        }
    }

    @Get("logout")
    async logout(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const userId = req?.user?.id;
        this.LOGGER.log(`Logging out user ${userId ?? "\"\""}...`);
        const result = await this.authOrchestrator.logout();
        res.clearCookie(AUTH_TOKEN_NAME);
        res.redirect(result.redirectTo);
        this.LOGGER.log(`Logged out user ${userId ?? "\"\""}.`);
    }
}
