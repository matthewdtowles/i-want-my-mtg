import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';
import { getLogger } from 'src/logger/global-app-logger';
import { AuthenticatedRequest } from './base/authenticated.request';

/**
 * Maps a thrown value to the HttpException it should be presented as: an existing
 * HttpException passes through, a Domain*Error maps to the matching status
 * (preserving its user-facing message), and anything else returns null (a
 * genuinely unexpected error the caller should treat as a 500). Single source of
 * truth for the domain-error → HTTP mapping, shared by the orchestrator handler
 * below and the global HttpExceptionFilter.
 */
export function domainErrorToHttpException(error: unknown): HttpException | null {
    if (error instanceof HttpException) {
        return error;
    }
    if (error instanceof DomainNotFoundError) {
        return new NotFoundException(error.message);
    }
    if (error instanceof DomainNotAuthorizedError) {
        return new ForbiddenException(error.message);
    }
    if (error instanceof DomainValidationError) {
        return new BadRequestException(error.message);
    }
    return null;
}

export class HttpErrorHandler {
    private static readonly LOGGER = getLogger(HttpErrorHandler.name);

    /**
     * Logs the error and throws the standardized HTTP exception for it: an
     * existing HttpException or a mapped Domain*Error, else a generic 500.
     * @param error the error that occurred
     * @param context the context in which the error occurred, used for logging
     * @returns never — always throws
     */
    static toHttpException(error: unknown, context: string): never {
        // Catch vars are `any` here (strictNullChecks off), so a non-Error value
        // can reach us at runtime — normalize before touching .message/.stack.
        const err = error instanceof Error ? error : new Error(String(error));
        this.LOGGER.error(`Error in ${context}: ${err.message}`, err.stack);
        // An existing HttpException (e.g. an auth guard's UnauthorizedException)
        // or a Domain*Error maps directly (HttpException passthrough first, so a
        // 401 "User not found in request" is not re-mapped to a 404 — W1/B1).
        // Anything else is a genuinely unexpected error: a generic 500 that never
        // leaks the underlying message.
        const mapped = domainErrorToHttpException(error);
        if (mapped) {
            throw mapped;
        }
        throw new InternalServerErrorException('An unexpected error occurred');
    }

    /**
     * Validates that the request is authenticated and contains a valid user.
     * @param req the authenticated request to validate
     * @throws UnauthorizedException if the request is not authenticated or does not contain a valid user
     */
    static validateAuthenticatedRequest(req: AuthenticatedRequest): void {
        if (!req) {
            throw new UnauthorizedException('Request not found');
        }
        if (!req.user) {
            throw new UnauthorizedException('User not found in request');
        }
        if (!req.user.id) {
            throw new UnauthorizedException('User does not have valid ID');
        }
    }
}
