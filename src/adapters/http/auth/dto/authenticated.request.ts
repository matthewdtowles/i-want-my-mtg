import { Request } from "express";
import { UserResponseDto } from "src/adapters/http/user/dto/user.response.dto";

/**
 * Extend the Request interface to include a user property
 * Use when user info is needed in the request
 */
export interface AuthenticatedRequest extends Request {
    user: UserResponseDto;
}