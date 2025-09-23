import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { AUTH_TOKEN_NAME } from "src/http/auth/dto/auth.types";

@Injectable()
export class UserGuard extends AuthGuard("jwt") {
    private readonly LOGGER: Logger = new Logger(UserGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        this.LOGGER.debug(`UserGuard canActivate called`);
        const request = context.switchToHttp().getRequest<Request>();

        const jwt = request.cookies[AUTH_TOKEN_NAME];
        this.LOGGER.debug(`JWT in cookie: ${jwt ? 'found' : 'not found'}`);

        return super.canActivate(context) as Promise<boolean>;
    }
}
