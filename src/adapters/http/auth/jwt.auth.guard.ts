import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { lastValueFrom, Observable } from "rxjs";
import { AUTH_TOKEN_NAME } from "./auth.constants";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    private readonly LOGGER: Logger = new Logger(JwtAuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        this.LOGGER.debug(`JwtAuthGuard canActivate called`);
        const request = context.switchToHttp().getRequest<Request>();
        const jwt = request.cookies[AUTH_TOKEN_NAME];
        if (!jwt) {
            this.LOGGER.error(`No JWT found in request`);
            return false;
        }
        this.LOGGER.debug(`JWT found in request: ${jwt}`);
        request.headers[AUTH_TOKEN_NAME] = `Bearer ${jwt}`;
        const canActivateResult = await super.canActivate(context);
        if (canActivateResult instanceof Observable) {
            return lastValueFrom(canActivateResult);
        }
        return canActivateResult;
    }
}
