import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject, Patch,
    Post,
    Render,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AUTH_TOKEN_NAME } from "src/adapters/http/auth/dto/auth.types";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { JwtAuthGuard } from "src/adapters/http/auth/jwt.auth.guard";
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { UpdateUserRequestDto } from "src/adapters/http/user/dto/update-user.request.dto";
import { UserOrchestrator } from "src/adapters/http/user/user.orchestrator";
import { AuthToken } from "src/core/auth/auth.types";
import { CreateUserRequestDto } from "./dto/create-user.request.dto";
import { UserViewDto } from "./dto/user.view.dto";
import { CreateUserFormDto } from "src/adapters/http/user/dto/create-user-form.dto";
import { ApiResult, createErrorResult, createSuccessResult } from "src/adapters/http/api.result";


@Controller("user")
export class UserController {
    constructor(@Inject(UserOrchestrator) private readonly userOrchestrator: UserOrchestrator) { }

    @Get("create")
    @Render("createUser")
    createForm(): CreateUserFormDto {
        return this.userOrchestrator.getCreateUserForm();
    }

    @Post("create")
    async create(@Body() createUserDto: CreateUserRequestDto, @Res() res: Response): Promise<void> {
        const authToken: AuthToken = await this.userOrchestrator.create(createUserDto);
        res.cookie(AUTH_TOKEN_NAME, authToken.access_token, {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000,
        }).redirect(`/?action=create&status=${HttpStatus.CREATED}&message=User%20created`);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("user")
    async findById(@Req() req: AuthenticatedRequest): Promise<UserViewDto> {
        return this.userOrchestrator.findUser(req);
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() httpUserDto: UpdateUserRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResult<UserViewDto>> {
        try {
            const updatedUser: UserViewDto = await this.userOrchestrator.updateUser(httpUserDto, req);
            return createSuccessResult<UserViewDto>(updatedUser, "User udpated");
        } catch (error) {
            return createErrorResult(`Failed to update user: ${error.message}`);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch("password")
    async updatePassword(
        @Body("password") password: string,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResult<BaseViewDto>> {
        try {
            const responseData: BaseViewDto = await this.userOrchestrator.updatePassword(password, req);
            return createSuccessResult<BaseViewDto>(responseData, "Password updated");
        } catch (error) {
            return createErrorResult(`Failed to update password: ${error.message}`);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    async remove(@Req() req: AuthenticatedRequest): Promise<ApiResult<BaseViewDto>> {
        try {
            const response: BaseViewDto = await this.userOrchestrator.deleteUser(req);
            return createSuccessResult<BaseViewDto>(response, "User deleted");
        } catch (error) {
            return createErrorResult(`Failed to delete user: ${error.message}`);
        }
    }
}