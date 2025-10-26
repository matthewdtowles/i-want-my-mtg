import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { getLogger } from "src/logger/global-app-logger";
import { AUTH_TOKEN_NAME } from "./dto/auth.types";

@Injectable()
export class OptionalAuthGuard extends AuthGuard("jwt") {
    private readonly LOGGER = getLogger(OptionalAuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const request = context.switchToHttp().getRequest<Request>();
            const jwt = request.cookies[AUTH_TOKEN_NAME];
            if (!jwt) {
                this.LOGGER.debug(`No JWT found - allowing unauthenticated access`);
                return true;
            }
            const result = await super.canActivate(context);
            return !!result;
        } catch (error) {
            this.LOGGER.debug(`Authentication failed, but allowing unauthenticated access: ${error.message}`);
            return true;
        }
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        if (err || !user) {
            this.LOGGER.debug(`No authenticated user - proceeding with null user`);
            return null;
        }
        this.LOGGER.debug(`Authenticated user: ${user.email}`);
        return user;
    }
}