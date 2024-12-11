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
import { IsEmail, IsString } from "class-validator";
import { Response } from "express";
import { ActionStatus, BaseHttpDto } from "src/adapters/http/http.types";
import { AuthServicePort } from "src/core/auth/api/auth.service.port";
import { AuthToken } from "src/core/auth/api/auth.types";
import { CreateUserDto, UpdateUserDto, UserDto } from "src/core/user/api/user.dto";
import { UserServicePort } from "src/core/user/api/user.service.port";
import { AUTH_TOKEN_NAME, AuthenticatedRequest } from "./auth/auth.types";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";

export class UpdateUserHttpDto {
    @IsString() readonly name: string;
    @IsEmail() readonly email: string;
}

export class UserHttpDto extends BaseHttpDto {
    readonly user: UserDto;
}

@Controller("user")
export class UserController {
    private readonly LOGGER = new Logger(UserController.name);

    constructor(
        @Inject(UserServicePort) private readonly userService: UserServicePort,
        @Inject(AuthServicePort) private readonly authService: AuthServicePort,
    ) { }

    @Get("create")
    @Render("create-user")
    createForm() {
        this.LOGGER.debug(`Create user form called`);
        return {};
    }

    @Post("create")
    async create(@Body() createUserDto: CreateUserDto, @Res() res: Response): Promise<void> {
        this.LOGGER.debug(`Create user called`);
        const createdUser: UserDto = await this.userService.create(createUserDto);
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
    async findById(@Req() req: AuthenticatedRequest): Promise<UserHttpDto> {
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
        const foundUser: UserDto = await this.userService.findById(id);
        const login: boolean =
            foundUser &&
            req.query &&
            req.query.status === HttpStatus.OK.toString() &&
            req.query.action === "login";
        return {
            authenticated: req.isAuthenticated(),
            message: login ? `${foundUser.name} - logged in` : null,
            status: login ? ActionStatus.SUCCESS : ActionStatus.NONE,
            user: foundUser,
        };
    }


    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() httpUserDto: UpdateUserHttpDto,
        @Req() req: AuthenticatedRequest
    ): Promise<UserHttpDto | BaseHttpDto> {
        this.LOGGER.debug(`Update user`);
        try {
            if (!req || !req.user || !req.user.id) {
                throw new Error("Unauthorized to update user");
            }
            if (req.user.email === httpUserDto.email && req.user.name === httpUserDto.name) {
                return {
                    authenticated: req.isAuthenticated(),
                    message: "No changes detected",
                    status: ActionStatus.NONE,
                    user: null,
                };
            }
            const updateUserDto: UpdateUserDto = {
                id: req.user.id,
                name: httpUserDto.name,
                email: httpUserDto.email,
            };
            const updatedUser: UserDto = await this.userService.update(updateUserDto);
            return {
                authenticated: req.isAuthenticated(),
                message: `User ${updatedUser.name} updated successfully`,
                status: ActionStatus.SUCCESS,
                user: updatedUser,
            };
        } catch (error) {
            return {
                authenticated: false,
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
    ): Promise<BaseHttpDto> {
        this.LOGGER.debug(`Update user password`);
        try {
            if (!req || !req.user || !req.user.id) {
                throw new Error("Unauthorized to update user password");
            }
            const pwdUpdated: boolean = await this.userService.updatePassword(req.user.id, password);
            return {
                authenticated: req.isAuthenticated(),
                message: pwdUpdated ? "Password updated" : "Error updating password",
                status: pwdUpdated ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            };
        } catch (error) {
            return {
                authenticated: false,
                message: `Error updating user: ${error.message}`,
                status: ActionStatus.ERROR,
            }
        }
    }


    @UseGuards(JwtAuthGuard)
    @Delete()
    async remove(@Req() req: AuthenticatedRequest): Promise<BaseHttpDto> {
        this.LOGGER.debug(`Delete user`);
        try {
            if (!req || !req.user || !req.user.id) {
                throw new Error("Unauthorized to delete user");
            }
            const id: number = req.user.id;
            await this.userService.remove(id);
            const user: UserDto = await this.userService.findById(id);
            if (user && user.name) {
                throw new Error("Could not delete user");
            }
            return {
                authenticated: req.isAuthenticated(),
                message: "User deleted successfully",
                status: ActionStatus.SUCCESS,
            };
        } catch (error) {
            return {
                authenticated: false,
                message: error.message,
                status: ActionStatus.ERROR,
            };
        }
    }
}