import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Patch,
    Post,
    Render,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AUTH_TOKEN_NAME, AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { JwtAuthGuard } from "src/adapters/http/auth/jwt.auth.guard";
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { UpdateUserRequestDto } from "src/adapters/http/user/dto/update-user.request.dto";
import { AuthService } from "src/core/auth/auth.service";
import { AuthToken } from "src/core/auth/auth.types";
import { User } from "src/core/user/user.entity";
import { UserService } from "src/core/user/user.service";
import { UserRole } from "src/shared/constants/user.role.enum";
import { CreateUserRequestDto } from "./dto/create-user.request.dto";
import { UserResponseDto } from "./dto/user.response.dto";
import { UserViewDto } from "./dto/user.view.dto";


@Controller("user")
export class UserController {
    private readonly LOGGER = new Logger(UserController.name);

    private readonly breadCrumbs = [
        { label: "Home", url: "/" },
        { label: "Account Settings", url: "/user" },
    ];

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(AuthService) private readonly authService: AuthService,
    ) { }

    @Get("create")
    @Render("create-user")
    createForm() {
        this.LOGGER.debug(`Create user form called`);
        return {};
    }

    @Post("create")
    async create(@Body() createUserDto: CreateUserRequestDto, @Res() res: Response): Promise<void> {
        this.LOGGER.debug(`Create user called`);
        const user: User = new User({
            email: createUserDto.email,
            name: createUserDto.name,
            password: createUserDto.password,
            role: UserRole.User,
        });
        const createdUser: User = await this.userService.create(user);
        if (!createdUser) {
            throw new Error(`Could not create user`);
        }
        const authToken: AuthToken = await this.authService.login(createdUser);
        if (!authToken) {
            throw new Error(`Could not create auth token`);
        }
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
        this.LOGGER.debug(`Find user by ID`);
        if (!req) {
            throw new Error("Request undefined, unauthorized to view user");
        }
        if (!req.user) {
            throw new Error("Request user undefined, unauthorized to view user");
        }
        if (!req.user.id) {
            throw new Error("Request user ID undefined, unauthorized to view user");
        }
        const id: number = req.user.id;
        const foundUser: UserResponseDto = await this.userService.findById(id);
        const login: boolean =
            foundUser &&
            req.query &&
            req.query.status === HttpStatus.OK.toString() &&
            req.query.action === "login";
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: this.breadCrumbs,
            message: login ? `${foundUser.name} - logged in` : null,
            status: login ? ActionStatus.SUCCESS : ActionStatus.NONE,
            user: foundUser,
        };
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() httpUserDto: UpdateUserRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<UserViewDto | BaseViewDto> {
        this.LOGGER.debug(`Update user`);
        try {
            if (!req || !req.user || !req.user.id) {
                throw new Error("Unauthorized to update user");
            }
            if (req.user.email === httpUserDto.email && req.user.name === httpUserDto.name) {
                return {
                    authenticated: req.isAuthenticated(),
                    breadcrumbs: this.breadCrumbs,
                    message: "No changes detected",
                    status: ActionStatus.NONE,
                    user: null,
                };
            }
            const updateUser: User = new User({
                id: req.user.id,
                name: httpUserDto.name,
                email: httpUserDto.email,
            });
            const updatedUser: UserResponseDto = await this.userService.update(updateUser);
            return {
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                message: `User ${updatedUser.name} updated successfully`,
                status: ActionStatus.SUCCESS,
                user: updatedUser,
            };
        } catch (error) {
            return {
                authenticated: false,
                breadcrumbs: this.breadCrumbs,
                message: `Error updating user: ${error.message}`,
                status: ActionStatus.ERROR,
                user: null,
            };
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch("password")
    async updatePassword(
        @Body("password") password: string,
        @Req() req: AuthenticatedRequest
    ): Promise<BaseViewDto> {
        this.LOGGER.debug(`Update user password`);
        try {
            if (!req || !req.user || !req.user.id) {
                throw new Error("Unauthorized to update user password");
            }
            const coreUser: User = new User({
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role as UserRole,
            });
            const pwdUpdated: boolean = await this.userService.updatePassword(coreUser, password);
            return {
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                message: pwdUpdated ? "Password updated" : "Error updating password",
                status: pwdUpdated ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            };
        } catch (error) {
            return {
                authenticated: false,
                breadcrumbs: this.breadCrumbs,
                message: `Error updating user: ${error.message}`,
                status: ActionStatus.ERROR,
            }
        }
    }


    @UseGuards(JwtAuthGuard)
    @Delete()
    async remove(@Req() req: AuthenticatedRequest): Promise<BaseViewDto> {
        this.LOGGER.debug(`Delete user`);
        try {
            if (!req || !req.user || !req.user.id) {
                throw new Error("Unauthorized to delete user");
            }
            const id: number = req.user.id;
            await this.userService.remove(id);
            const user: UserResponseDto = await this.userService.findById(id);
            if (user && user.name) {
                throw new Error("Could not delete user");
            }
            return {
                authenticated: false,
                breadcrumbs: this.breadCrumbs,
                message: "User deleted successfully",
                status: ActionStatus.SUCCESS,
            };
        } catch (error) {
            return {
                authenticated: false,
                breadcrumbs: this.breadCrumbs,
                message: error.message,
                status: ActionStatus.ERROR,
            };
        }
    }
}