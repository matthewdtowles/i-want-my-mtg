import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { AuthService } from "src/core/auth/auth.service";
import { AuthToken } from "src/core/auth/auth.types";
import { User } from "src/core/user/user.entity";
import { UserService } from "src/core/user/user.service";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { BaseViewDto } from "src/http/base/base.view.dto";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { getLogger } from "src/logger/global-app-logger";
import { UserRole } from "src/shared/constants/user.role.enum";
import { CreateUserRequestDto } from "./dto/create-user.request.dto";
import { UpdateUserRequestDto } from "./dto/update-user.request.dto";
import { UserResponseDto } from "./dto/user.response.dto";
import { UserViewDto } from "./dto/user.view.dto";

@Injectable()
export class UserOrchestrator {

    private readonly LOGGER = getLogger(UserOrchestrator.name);

    private readonly breadCrumbs = [
        { label: "Home", url: "/" },
        { label: "User", url: "/user" },
    ];

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(AuthService) private readonly authService: AuthService,
    ) {
        this.LOGGER.debug(`Initialized`);
    }

    async create(createUserDto: CreateUserRequestDto): Promise<AuthToken> {
        this.LOGGER.debug(`Creating user with email: ${createUserDto.email}.`);
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
            this.LOGGER.debug(`Error creating user with email: ${createUserDto.email}.`)
            return HttpErrorHandler.toHttpException(error, "create");
        }
    }

    async findUser(req: AuthenticatedRequest): Promise<UserViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Find user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const user: UserResponseDto = await this.userService.findById(userId);
            const login: boolean =
                user &&
                req.query &&
                req.query.status === HttpStatus.OK.toString() &&
                req.query.action === "login";
            this.LOGGER.debug(`User ${userId} login ${login ? "success" : "failed"}.`)
            return {
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                message: login ? `${user.name} - logged in` : null,
                status: login ? ActionStatus.SUCCESS : ActionStatus.NONE,
                user,
            };
        } catch (error) {
            this.LOGGER.debug(`Error finding user ${userId}.`)
            return HttpErrorHandler.toHttpException(error, "findUser");
        }
    }

    async updateUser(userRequestDto: UpdateUserRequestDto, req: AuthenticatedRequest): Promise<UserViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Updating user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            if (req.user.email === userRequestDto.email && req.user.name === userRequestDto.name) {
                this.LOGGER.debug(`No changes detected for user ${userId}.`);
                return new UserViewDto({
                    authenticated: req.isAuthenticated(),
                    breadcrumbs: this.breadCrumbs,
                    message: "No changes detected",
                    status: ActionStatus.NONE,
                    user: null,
                });
            }
            const updateUser: User = new User({
                id: userId,
                name: userRequestDto.name,
                email: userRequestDto.email,
            });
            const updatedUser: UserResponseDto = await this.userService.update(updateUser);
            this.LOGGER.debug(`User ${updatedUser.id} updated successfully.`);
            return new UserViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                message: `User ${updatedUser.name} updated successfully`,
                status: ActionStatus.SUCCESS,
                user: updatedUser,
            });
        } catch (error) {
            this.LOGGER.debug(`Error updating user ${userId}.`);
            return HttpErrorHandler.toHttpException(error, "findUser");
        }
    }

    async updatePassword(password: string, req: AuthenticatedRequest): Promise<BaseViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Update password for user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            const coreUser: User = new User({
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role as UserRole,
            });
            const pwdUpdated: boolean = await this.userService.updatePassword(coreUser, password);
            this.LOGGER.debug(`Password update for user ${userId}: ${pwdUpdated ? "success" : "failed"}.`);
            return new BaseViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: this.breadCrumbs,
                message: pwdUpdated ? "Password updated" : "Error updating password",
                status: pwdUpdated ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            });
        } catch (error) {
            this.LOGGER.debug(`Error updating password for user ${userId}.`);
            return HttpErrorHandler.toHttpException(error, "updatePassword");
        }
    }

    async deleteUser(req: AuthenticatedRequest): Promise<BaseViewDto> {
        const userId = req?.user?.id;
        this.LOGGER.debug(`Deleting user ${userId}.`);
        try {
            HttpErrorHandler.validateAuthenticatedRequest(req);
            await this.userService.remove(req.user.id);
            const user: UserResponseDto = await this.userService.findById(req.user.id);
            if (user && user.name) {
                this.LOGGER.debug(`Failed to delete user ${userId}.`);
                throw new Error("Could not delete user");
            }
            this.LOGGER.debug(`User ${userId} deleted successfully.`);
            return new BaseViewDto({
                authenticated: false,
                breadcrumbs: this.breadCrumbs,
                message: "User deleted successfully",
                status: ActionStatus.SUCCESS,
            });
        } catch (error) {
            this.LOGGER.debug(`Error deleting user ${userId}.`);
            return HttpErrorHandler.toHttpException(error, "deleteUser");
        }
    }
}