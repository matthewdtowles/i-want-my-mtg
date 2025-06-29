import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { HttpErrorHandler } from "src/adapters/http/http.error.handler";
import { CreateUserRequestDto } from "src/adapters/http/user/dto/create-user.request.dto";
import { UpdateUserRequestDto } from "src/adapters/http/user/dto/update-user.request.dto";
import { UserResponseDto } from "src/adapters/http/user/dto/user.response.dto";
import { UserViewDto } from "src/adapters/http/user/dto/user.view.dto";
import { AuthService } from "src/core/auth/auth.service";
import { AuthToken } from "src/core/auth/auth.types";
import { User } from "src/core/user/user.entity";
import { UserService } from "src/core/user/user.service";
import { UserRole } from "src/shared/constants/user.role.enum";

@Injectable()
export class UserOrchestrator {

    private readonly LOGGER = new Logger(UserOrchestrator.name);

    private readonly breadCrumbs = [
        { label: "Home", url: "/" },
        { label: "User", url: "/user" },
    ];

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(AuthService) private readonly authService: AuthService,
    ) { }

    async create(createUserDto: CreateUserRequestDto): Promise<AuthToken> {
        this.LOGGER.log(`Creating user with email: ${createUserDto.email}`);
        try {
            const user: User = new User({
                email: createUserDto.email,
                name: createUserDto.name,
                password: createUserDto.password,
                role: UserRole.User
            });
            const createdUser: User = await this.userService.create(user);
            if (!createdUser) {
                throw new Error("User creation failed");
            }
            const authToken: AuthToken = await this.authService.login(createdUser);
            if (!authToken?.access_token) {
                throw new Error("Authentication token generation failed");
            }
            return authToken;
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "create");
        }
    }

    async findUser(req: AuthenticatedRequest): Promise<UserViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
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
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findUser");
        }
    }

    async updateUser(userRequestDto: UpdateUserRequestDto, req: AuthenticatedRequest): Promise<UserViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            if (req.user.email === userRequestDto.email && req.user.name === userRequestDto.name) {
                return new UserViewDto({
                    authenticated: req.isAuthenticated(),
                    breadcrumbs: this.breadCrumbs,
                    message: "No changes detected",
                    status: ActionStatus.NONE,
                    user: null,
                });
            }
            const updateUser: User = new User({
                id: req.user.id,
                name: userRequestDto.name,
                email: userRequestDto.email,
            });
            const updatedUser: UserResponseDto = await this.userService.update(updateUser);
            return new UserViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                message: `User ${updatedUser.name} updated successfully`,
                status: ActionStatus.SUCCESS,
                user: updatedUser,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findUser");
        }
    }

    async updatePassword(password: string, req: AuthenticatedRequest): Promise<BaseViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const coreUser: User = new User({
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role as UserRole,
            });
            const pwdUpdated: boolean = await this.userService.updatePassword(coreUser, password);
            return new BaseViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                message: pwdUpdated ? "Password updated" : "Error updating password",
                status: pwdUpdated ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "updatePassword");
        }
    }

    async deleteUser(req: AuthenticatedRequest): Promise<BaseViewDto> {
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            await this.userService.remove(req.user.id);
            const user: UserResponseDto = await this.userService.findById(req.user.id);
            if (user && user.name) {
                throw new Error("Could not delete user");
            }
            return new BaseViewDto({
                authenticated: false,
                breadcrumbs: this.breadCrumbs,
                message: "User deleted successfully",
                status: ActionStatus.SUCCESS,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "deleteUser");
        }
    }
}