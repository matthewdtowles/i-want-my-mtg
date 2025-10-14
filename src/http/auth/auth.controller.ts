import {
    Controller,
    Get, Inject, Post,
    Render,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AuthOrchestrator } from "./auth.orchestrator";
import { AuthResult } from "./dto/auth.result";
import { AUTH_TOKEN_NAME } from "./dto/auth.types";
import { AuthenticatedRequest } from "./dto/authenticated.request";
import { LoginFormViewDto } from "./dto/login-form.view.dto";
import { LocalAuthGuard } from "./local.auth.guard";

@Controller("auth")
export class AuthController {

    constructor(@Inject(AuthOrchestrator) private readonly authOrchestrator: AuthOrchestrator) { }

    @Get("login")
    @Render("login")
    async loginForm(): Promise<LoginFormViewDto> {
        return new LoginFormViewDto();
    }

    @UseGuards(LocalAuthGuard)
    @Post("login")
    async login(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const result: AuthResult = await this.authOrchestrator.login(req.user);
        if (result.success && result.token) {
            res.cookie(AUTH_TOKEN_NAME, result.token, {
                httpOnly: true,
                sameSite: "strict",
                secure: false,
                maxAge: 3600000,
                path: "/",
                domain: undefined,
            });
            return res.redirect("/user");
        } else {
            return res.redirect("/auth/login?error=Invalid credentials");
        }
    }

    @Get("logout")
    async logout(@Res() res: Response): Promise<void> {
        const result = await this.authOrchestrator.logout();
        res.clearCookie(AUTH_TOKEN_NAME);
        res.redirect(result.redirectTo);
    }
}
