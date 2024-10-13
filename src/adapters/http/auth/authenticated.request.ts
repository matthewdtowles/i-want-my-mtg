import { UserDto } from "src/core/user/dto/user.dto";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: UserDto;
}
