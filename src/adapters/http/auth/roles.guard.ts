import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserDto } from "src/core/user/dto/user.dto";
import { UserRole } from "./user.role";

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
    // TODO: request.user is undefined --- investigate why
    const request = context.switchToHttp().getRequest();
    
    this.LOGGER.debug(`request.user: ${JSON.stringify(request.user)}`);
    
    const user: UserDto = request.user;
    
    this.LOGGER.debug(`user: ${JSON.stringify(user)}`);
    return user.role === UserRole.Admin || role === user.role;
  }
}
