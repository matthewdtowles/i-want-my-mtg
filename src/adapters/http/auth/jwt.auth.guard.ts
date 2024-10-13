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
    request.headers["authorization"] = `Bearer ${jwt}`;
    return super.canActivate(context);
  }
}
