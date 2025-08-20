import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { AuthResult } from "src/http/auth/dto/auth.result";
import { AuthService } from "src/core/auth/auth.service";
import { AuthToken } from "src/core/auth/auth.types";
import { User } from "src/core/user/user.entity";
import { UserRole } from "src/shared/constants/user.role.enum";
import { UserResponseDto } from "../user/dto/user.response.dto";


@Injectable()
export class AuthOrchestrator {
    private readonly LOGGER: Logger = new Logger(AuthOrchestrator.name);

    constructor(@Inject(AuthService) private readonly authService: AuthService) { }

    async login(user: UserResponseDto): Promise<AuthResult> {
        try {
            this.LOGGER.debug(`Processing login for user ${user?.name}`);
            if (!user || !user.id) {
                throw new Error("User not found or invalid");
            }
            const coreUser: User = new User({
                id: user.id,
                email: user.email,
                name: user.name,
                role: UserRole[user.role as keyof typeof UserRole] || UserRole.User
            });
            const authToken: AuthToken = await this.authService.login(coreUser);
            if (!authToken || !authToken.access_token) {
                throw new Error("Authentication token generation failed");
            }
            this.LOGGER.log(`${user.name} logged in successfully`);
            return new AuthResult({
                success: true,
                token: authToken.access_token,
                redirectTo: `/user?action=login&status=${HttpStatus.OK}`,
                statusCode: HttpStatus.OK,
                user: coreUser
            });
        } catch (error) {
            this.LOGGER.error(`Login error: ${error.message}`);
            return new AuthResult({
                success: false,
                redirectTo: `/login?action=login&status=${HttpStatus.UNAUTHORIZED}&message=Authentication%20failed`,
                statusCode: HttpStatus.UNAUTHORIZED,
                error: error.message
            });
        }
    }

    async logout(): Promise<AuthResult> {
        try {
            this.LOGGER.debug(`Processing logout`);
            return new AuthResult({
                success: true,
                redirectTo: `/?action=logout&status=${HttpStatus.OK}&message=Logged%20out`,
                statusCode: HttpStatus.OK
            });
        } catch (error) {
            this.LOGGER.error(`Logout error: ${error.message}`);
            return new AuthResult({
                success: false,
                redirectTo: `/?action=logout&status=${HttpStatus.INTERNAL_SERVER_ERROR}&message=Logout%20failed`,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message
            });
        }
    }
}

