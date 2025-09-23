import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { lastValueFrom, Observable } from "rxjs";
import { AUTH_TOKEN_NAME } from "./dto/auth.types";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    private readonly LOGGER: Logger = new Logger(JwtAuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        this.LOGGER.debug(`JwtAuthGuard canActivate called`);
        const request = context.switchToHttp().getRequest<Request>();
        
        // Debug: Log all cookies and headers
        this.LOGGER.debug(`All cookies: ${JSON.stringify(request.cookies)}`);
        this.LOGGER.debug(`Cookie header: ${request.headers.cookie}`);
        this.LOGGER.debug(`Host: ${request.headers.host}`);
        this.LOGGER.debug(`Authorization header: ${request.headers.authorization}`);
        
        const jwt = request.cookies[AUTH_TOKEN_NAME];
        if (!jwt) {
            this.LOGGER.error(`No JWT found in request cookies for token name: ${AUTH_TOKEN_NAME}`);
            return false;
        }
        
        this.LOGGER.debug(`Found JWT: ${jwt.substring(0, 20)}...`);
        request.headers[AUTH_TOKEN_NAME] = `Bearer ${jwt}`;
        
        const canActivateResult = await super.canActivate(context);
        if (canActivateResult instanceof Observable) {
            return lastValueFrom(canActivateResult);
        }
        return canActivateResult;
    }
}
