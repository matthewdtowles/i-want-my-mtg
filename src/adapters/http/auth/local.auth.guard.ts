import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { Request } from "express";
import { AUTH_TOKEN_NAME } from "./auth.constants";

/**
 * Trigger local auth strategy to validate email and password during login
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
  private readonly LOGGER: Logger = new Logger(LocalAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    this.LOGGER.debug(`LocalAuthGuard canActivate called`);
    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      this.LOGGER.error(`No request found`);
      return false;
    }
    const jwt = request.cookies[AUTH_TOKEN_NAME];
    if (!jwt) {
      this.LOGGER.error(`No JWT found in request`);
      return false;
    }
    this.LOGGER.debug(`JWT found in request: ${jwt}`);
    request.headers[AUTH_TOKEN_NAME] = `Bearer ${jwt}`;
    const isAuthenticated = super.canActivate(context);
    if (isAuthenticated) {
      this.LOGGER.debug(`LocalAuthGuard canActivate: true`);
    } else {
      this.LOGGER.error(`LocalAuthGuard canActivate: false`);
    }
    return isAuthenticated;
  }

  handleRequest(err, user, info) {
    this.LOGGER.debug(`LocalAuthGuard handleRequest called`);
    if (err || !user) {
      if (err) {
        this.LOGGER.error(err);
        throw err;
      }
      const msg = `Unauthorized user in request`;
      this.LOGGER.error(msg);
      throw new UnauthorizedException(msg);
    }
    this.LOGGER.debug(`LocalAuthGuard handleRequest returning user: ${JSON.stringify(user)}`);
    return user;
  }
}
