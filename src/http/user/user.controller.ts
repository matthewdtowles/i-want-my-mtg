import {
    Body,
    Controller,
    Delete,
    Get, Inject,
    Patch,
    Post,
    Render,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AuthToken } from "src/core/auth/auth.types";
import { AUTH_TOKEN_NAME } from "src/http/auth/dto/auth.types";
import { JwtAuthGuard } from "src/http/auth/jwt.auth.guard";
import { ApiResult, createErrorResult, createSuccessResult } from "src/http/base/api.result";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { BaseViewDto } from "src/http/base/base.view.dto";
import { getLogger } from "src/logger/global-app-logger";
import { CreateUserRequestDto } from "./dto/create-user.request.dto";
import { CreateUserViewDto } from "./dto/create-user.view.dto";
import { UpdateUserRequestDto } from "./dto/update-user.request.dto";
import { UserViewDto } from "./dto/user.view.dto";
import { UserOrchestrator } from "./user.orchestrator";


@Controller("user")
export class UserController {

    private readonly LOGGER = getLogger(UserController.name);

    constructor(@Inject(UserOrchestrator) private readonly userOrchestrator: UserOrchestrator) { }

    @Get("create")
    @Render("createUser")
    createForm(): CreateUserViewDto {
        this.LOGGER.log(`Fetch create user form.`)
        return new CreateUserViewDto();
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("user")
    async profile(@Req() req: AuthenticatedRequest): Promise<UserViewDto> {
        this.LOGGER.log(`Get user profile.`)
        const user = await this.userOrchestrator.findUser(req);
        this.LOGGER.log(`Profile found for user ${user?.user?.id}.`);
        return user;
    }

    @Post("create")
    async create(@Body() createUserDto: CreateUserRequestDto, @Res() res: Response): Promise<void> {
        this.LOGGER.log(`Create new user ${createUserDto?.email}.`)
        try {
            const authToken: AuthToken = await this.userOrchestrator.create(createUserDto);
            res.cookie(AUTH_TOKEN_NAME, authToken.access_token, {
                httpOnly: true,
                sameSite: "strict",
                secure: false,
                maxAge: 3600000,
                path: "/",
            });
            res.redirect("/user?welcome=true");
            this.LOGGER.log(`New user created ${createUserDto?.email}.`)
        } catch (error) {
            this.LOGGER.error(`Error creating user ${createUserDto?.email}: ${error}.`);
            if (error?.message?.includes("already exists")) {
                res.render("createUser", {
                    error: "A user with this email already exists. Please try logging in instead.",
                    email: createUserDto.email,
                    name: createUserDto.name
                });
            } else {
                res.render("createUser", {
                    error: "An error occurred while creating your account. Please try again.",
                    email: createUserDto.email,
                    name: createUserDto.name
                });
            }
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() httpUserDto: UpdateUserRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResult<UserViewDto>> {
        try {
            this.LOGGER.log(`Update user ${httpUserDto?.email}.`)
            const updatedUser: UserViewDto = await this.userOrchestrator.updateUser(httpUserDto, req);
            this.LOGGER.log(`Update user success for ${updatedUser?.user?.email} [${updatedUser?.user?.id}].`)
            return createSuccessResult<UserViewDto>(updatedUser, "User udpated");
        } catch (error) {
            const msg = `Error updating user ${httpUserDto?.email}: ${error?.message}`;
            this.LOGGER.error(msg);
            return createErrorResult(msg);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch("password")
    async updatePassword(
        @Body("password") password: string,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResult<BaseViewDto>> {
        try {
            this.LOGGER.log(`Update password for user ${req?.user?.id}.`);
            const responseData: BaseViewDto = await this.userOrchestrator.updatePassword(password, req);
            this.LOGGER.log(`Update password success for user ${req?.user?.id}.`);
            return createSuccessResult<BaseViewDto>(responseData, "Password updated");
        } catch (error) {
            const msg = `Error updating password: ${error?.message}.`;
            this.LOGGER.error(msg);
            return createErrorResult(msg);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    async remove(@Req() req: AuthenticatedRequest): Promise<ApiResult<BaseViewDto>> {
        const userId = req?.user?.id ?? "\"\"";
        try {
            this.LOGGER.log(`Delete user account ${userId}.`);
            const response: BaseViewDto = await this.userOrchestrator.deleteUser(req);
            this.LOGGER.log(`Delete account successful for user ${userId}.`);
            return createSuccessResult<BaseViewDto>(response, "User deleted");
        } catch (error) {
            const msg = `Error deleting user ${userId}.`
            this.LOGGER.error(msg);
            return createErrorResult(msg);
        }
    }
}