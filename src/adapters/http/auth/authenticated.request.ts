import { UserDto } from "src/core/user/dto/user.dto";
import { Request } from "express";

/**
 * Extend the Request interface to include a user property
 * Use when user info is needed in the request
 */
export interface AuthenticatedRequest extends Request {
    user: UserDto;
}
