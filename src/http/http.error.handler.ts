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

export class HttpErrorHandler {
    private static readonly LOGGER = getLogger(HttpErrorHandler.name);

    /**
     * Handles errors by logging them and throwing standardized HTTP exceptions.
     * @param error the error that occurred
     * @param context the context in which the error occurred, used for logging
     * @returns never, throws an appropriate HTTP exception based on the error message
     */
    static toHttpException(error: Error, context: string): never {
        this.LOGGER.error(`Error in ${context}: ${error.message}`, error.stack);
        // An HttpException thrown inside the try block (e.g. an auth guard's
        // UnauthorizedException) is already the intended response — pass it
        // through. This must come first: without it the keyword fallback below
        // re-mapped a 401 "User not found in request" to a 404 (W1/B1).
        if (error instanceof HttpException) {
            throw error;
        }
        // Domain errors are the single convention for core failures. Map them to
        // the matching HTTP status, preserving the (user-facing) domain message.
        if (error instanceof DomainNotFoundError) {
            throw new NotFoundException(error.message);
        }
        if (error instanceof DomainNotAuthorizedError) {
            throw new ForbiddenException(error.message);
        }
        if (error instanceof DomainValidationError) {
            throw new BadRequestException(error.message);
        }
        // Transitional fallback for core services not yet migrated to Domain
        // errors (W1). Once every service throws Domain*Error, delete this block
        // so unmapped errors are honestly a 500.
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
