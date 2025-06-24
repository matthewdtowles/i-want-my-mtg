import { SetMetadata } from "@nestjs/common";

/**
 * Name of cookie with auth bearer token
 */
export const AUTH_TOKEN_NAME = "authorization";

export const Role = (...role: string[]) => SetMetadata("role", role);
