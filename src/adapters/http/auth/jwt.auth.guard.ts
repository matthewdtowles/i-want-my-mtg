import { ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { Observable } from "rxjs";
import { AUTH_TOKEN_NAME } from "./auth.constants";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly LOGGER: Logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    this.LOGGER.debug(`JwtAuthGuard canActivate called`);
    const request = context.switchToHttp().getRequest<Request>();
    const jwt = request.cookies[AUTH_TOKEN_NAME];
    if (!jwt) {
      this.LOGGER.error(`No JWT found in request`);
      return false;
    }
    this.LOGGER.debug(`JWT found in request: ${jwt}`);
    request.headers[AUTH_TOKEN_NAME] = `Bearer ${jwt}`;
    return super.canActivate(context);
  }
}
