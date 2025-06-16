import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserResponseDto } from "src/adapters/http/user/user.response.dto";
import { UserRole } from "src/shared/constants/user.role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly LOGGER: Logger = new Logger(RolesGuard.name);

    constructor(private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        this.LOGGER.debug(`canActivate invoked`);
        const role: string = this.reflector.get<string>("role", context.getHandler());
        if (!role) {
            return true;
        }
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const user: UserResponseDto = request.user;
        return user.role === UserRole.Admin || role === user.role;
    }
}
