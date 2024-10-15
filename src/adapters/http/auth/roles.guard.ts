import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserDto } from "src/core/user/dto/user.dto";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const role: string = this.reflector.get<string>(
      "role",
      context.getHandler(),
    );
    if (!role) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: UserDto = request.user;
    return role === user.role;
  }
}
