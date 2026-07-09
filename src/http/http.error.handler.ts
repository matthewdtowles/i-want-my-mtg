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
     * existing HttpException or a mapped Domain*Error, else a keyword fallback
     * (transitional), else a generic 500.
     * @param error the error that occurred
     * @param context the context in which the error occurred, used for logging
     * @returns never — always throws
     */
    static toHttpException(error: Error, context: string): never {
        this.LOGGER.error(`Error in ${context}: ${error.message}`, error.stack);
        // An existing HttpException (e.g. an auth guard's UnauthorizedException)
        // or a Domain*Error maps directly. HttpException passthrough must come
        // first: without it the keyword fallback below re-mapped a 401 "User not
        // found in request" to a 404 (W1/B1).
        const mapped = domainErrorToHttpException(error);
        if (mapped) {
            throw mapped;
        }
        // Transitional fallback for callers still throwing plain Error with
        // keyword-significant messages: the HBS orchestrators/presenters (e.g.
        // "Set with code X not found") plus a few defensive core guards
        // (auth.service.login's "User not found"). W1 part 2 migrated the core
        // domain conditions; this block is deleted in part 3 once those remaining
        // throws move to Domain*Error, so unmapped errors become an honest 500.
        if (error.message.includes('not found')) {
            throw new NotFoundException(error.message);
        }
        if (error.message.includes('unauthorized') || error.message.includes('not logged in')) {
            throw new UnauthorizedException(error.message);
        }
        if (error.message.includes('forbidden') || error.message.includes('not allowed')) {
            throw new ForbiddenException(error.message);
        }
        if (error.message.includes('invalid') || error.message.includes('required')) {
            throw new BadRequestException(error.message);
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
