import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { AUTH_TOKEN_NAME } from "./auth.constants";

@Injectable()
export class UserGuard extends AuthGuard("jwt") {
    private readonly LOGGER: Logger = new Logger(UserGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        this.LOGGER.debug(`UserGuard canActivate called`);
        const request = context.switchToHttp().getRequest<Request>();
        const jwt = request.cookies[AUTH_TOKEN_NAME];
        if (!jwt) {
            this.LOGGER.debug(`No JWT found in request -- not required`);
            return true;
        }
        this.LOGGER.debug(`JWT found in request: ${jwt}`);
        request.headers[AUTH_TOKEN_NAME] = `Bearer ${jwt}`;
        await super.canActivate(context);
        return true;
    }
}
