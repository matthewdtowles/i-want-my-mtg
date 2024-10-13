import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    // TODO: identify type for roles
    const roles = this.reflector.get<string[]>("roles", context.getHandler());
    if (!roles) {
      return true;
    }
    // TODO: identify type for request & user
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return this.matchRoles(roles, user.roles);
  }

  // TODO: identify types for allowedRoles and userRoles
  private matchRoles(allowedRoles: any, userRoles: any): boolean {
    return allowedRoles.some((role: any) => userRoles.includes(role));
  }
}
