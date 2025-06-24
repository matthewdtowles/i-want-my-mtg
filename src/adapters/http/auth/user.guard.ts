import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, response } from "express";
import * as passport from "passport";
import { AUTH_TOKEN_NAME } from "./dto/auth.types";

@Injectable()
export class UserGuard extends AuthGuard("jwt") {
    private readonly LOGGER: Logger = new Logger(UserGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        this.LOGGER.debug(`UserGuard canActivate called`);
        const request = context.switchToHttp().getRequest<Request>();
        const jwt = request.cookies[AUTH_TOKEN_NAME];
        if (jwt) {
            request.headers[AUTH_TOKEN_NAME] = `Bearer ${jwt}`;
        }
        return new Promise<boolean>((resolve) => {
            passport.authenticate('jwt', { session: false }, (err: Error | null, user: any, info: any) => {
                if (err) {
                    this.LOGGER.debug(`JWT validation failed: ${err.message}`);
                    return resolve(true);
                }
                if (user) {
                    request.user = user;
                }
                resolve(true);
            })(request, response, (err: Error) => {
                if (err) {
                    this.LOGGER.debug(`Passport middleware error: ${err.message}`);
                }
                resolve(true);
            });
        });
    }
}
