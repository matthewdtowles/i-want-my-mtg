import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserDto } from "src/core/user/dto/user.dto";
import { UserRole } from "./user.role";
import { exit } from "process";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly LOGGER: Logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    this.LOGGER.debug(`canActivate invoked`);
    const role: string = this.reflector.get<string>(
      "role",
      context.getHandler(),
    );
    if (!role) {
      this.LOGGER.debug(`no role specified, allowing access`);
      return true;
    }
    this.LOGGER.debug(`role specified: ${role}`);
    const request = context.switchToHttp().getRequest();
    const user: UserDto = request.user;
    this.LOGGER.debug(`user: ${JSON.stringify(user)}`);
    exit();
    //return user.role === UserRole.Admin || role === user.role;
  }
}
