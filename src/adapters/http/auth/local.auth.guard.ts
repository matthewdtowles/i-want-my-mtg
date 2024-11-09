import {
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { Observable } from "rxjs";
import { AUTH_TOKEN_NAME } from "./auth.types";

/**
 * Trigger local auth strategy to validate email and password during login
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
    private readonly LOGGER: Logger = new Logger(LocalAuthGuard.name);

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        this.LOGGER.debug(`LocalAuthGuard canActivate called`);
        const request = context.switchToHttp().getRequest<Request>();
        if (!request) {
            this.LOGGER.error(`No request found`);
            return false;
        }
        const jwt = request.cookies[AUTH_TOKEN_NAME];
        request.headers[AUTH_TOKEN_NAME] = `Bearer ${jwt}`;
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        this.LOGGER.debug(`LocalAuthGuard handleRequest called`);
        if (err) {
            throw err;
        }
        if (!user) {
            throw new UnauthorizedException(`Unauthorized user in request`);
        }
        return user;
    }
}
