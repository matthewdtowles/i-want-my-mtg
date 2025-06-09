import { SetMetadata } from "@nestjs/common";
import { UserDto } from "src/adapters/http/user/user.dto";
import { Request } from "express";

/**
 * Name of cookie with auth bearer token
 */
export const AUTH_TOKEN_NAME = "authorization";

/**
 * Extend the Request interface to include a user property
 * Use when user info is needed in the request
 */
export interface AuthenticatedRequest extends Request {
    user: UserDto;
}

export const Role = (...role: string[]) => SetMetadata("role", role);

// TODO: MOVE TO CORE ??
export enum UserRole {
    Admin = "admin",
    User = "user",
}