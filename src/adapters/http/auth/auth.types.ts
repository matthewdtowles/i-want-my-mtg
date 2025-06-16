import { SetMetadata } from "@nestjs/common";
import { Request } from "express";
import { UserResponseDto } from "src/adapters/http/user/user.response.dto";

/**
 * Name of cookie with auth bearer token
 */
export const AUTH_TOKEN_NAME = "authorization";

/**
 * Extend the Request interface to include a user property
 * Use when user info is needed in the request
 */
export interface AuthenticatedRequest extends Request {
    user: UserResponseDto;
}

export const Role = (...role: string[]) => SetMetadata("role", role);
