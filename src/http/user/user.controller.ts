import {
    Body,
    Controller,
    Delete,
    Get, Inject, Patch,
    Post,
    Render,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AuthToken } from "src/core/auth/auth.types";
import { ApiResult, createErrorResult, createSuccessResult } from "src/http/base/api.result";
import { AUTH_TOKEN_NAME } from "src/http/auth/dto/auth.types";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { JwtAuthGuard } from "src/http/auth/jwt.auth.guard";
import { BaseViewDto } from "src/http/base/base.view.dto";
import { CreateUserRequestDto } from "./dto/create-user.request.dto";
import { CreateUserViewDto } from "./dto/create-user.view.dto";
import { UpdateUserRequestDto } from "./dto/update-user.request.dto";
import { UserViewDto } from "./dto/user.view.dto";
import { UserOrchestrator } from "./user.orchestrator";


@Controller("user")
export class UserController {
    constructor(@Inject(UserOrchestrator) private readonly userOrchestrator: UserOrchestrator) { }

    @Get("create")
    @Render("createUser")
    createForm(): CreateUserViewDto {
        return new CreateUserViewDto();
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("user")
    async profile(@Req() req: AuthenticatedRequest): Promise<UserViewDto> {
        return this.userOrchestrator.findUser(req);
    }

    @Post("create")
    async create(@Body() createUserDto: CreateUserRequestDto, @Res() res: Response): Promise<void> {
        try {
            const authToken: AuthToken = await this.userOrchestrator.create(createUserDto);
            res.cookie(AUTH_TOKEN_NAME, authToken.access_token, {
                httpOnly: true,
                sameSite: "strict",
                secure: false,
                maxAge: 3600000,
                path: "/",
            });
            return res.redirect('/user?welcome=true');
        } catch (error) {
            if (error.message.includes('already exists')) {
                return res.render('createUser', {
                    error: 'A user with this email already exists. Please try logging in instead.',
                    email: createUserDto.email,
                    name: createUserDto.name
                });
            }
            return res.render('createUser', {
                error: 'An error occurred while creating your account. Please try again.',
                email: createUserDto.email,
                name: createUserDto.name
            });
        }
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