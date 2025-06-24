import {
    Controller,
    Get, Inject, Post,
    Render,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AuthOrchestrator } from "src/adapters/http/auth/auth.orchestrator";
import { AuthResult } from "src/adapters/http/auth/dto/auth.result";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { LoginFormResponseDto } from "src/adapters/http/auth/dto/login-form.response.dto";
import { AUTH_TOKEN_NAME } from "./dto/auth.types";
import { LocalAuthGuard } from "./local.auth.guard";

@Controller("auth")
export class AuthController {

    constructor(@Inject(AuthOrchestrator) private readonly authOrchestrator: AuthOrchestrator) { }

    @Get("login")
    @Render("login")
    async loginForm(): Promise<LoginFormResponseDto> {
        return this.authOrchestrator.getLoginFormData();
    }

    @UseGuards(LocalAuthGuard)
    @Post("login")
    async login(@Req() req: AuthenticatedRequest, @Res() res: Response): Promise<void> {
        const result: AuthResult = await this.authOrchestrator.login(req.user);
        if (result.success && result.token) {
            res.cookie(AUTH_TOKEN_NAME, result.token, {
                httpOnly: true,
                sameSite: "strict",
                secure: process.env.NODE_ENV === "production",
                maxAge: 3600000, // 1 hour
            });
        }
        res.redirect(result.redirectTo);
    }

    @Get("logout")
    async logout(@Res() res: Response): Promise<void> {
        const result = await this.authOrchestrator.logout();
        res.clearCookie(AUTH_TOKEN_NAME);
        res.redirect(result.redirectTo);
    }
}
