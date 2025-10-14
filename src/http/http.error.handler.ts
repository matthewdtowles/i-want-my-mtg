import {
    BadRequestException,
    ForbiddenException, InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException
} from "@nestjs/common";
import { AuthenticatedRequest } from "./auth/dto/authenticated.request";


export class HttpErrorHandler {
    private static readonly LOGGER: Logger = new Logger(HttpErrorHandler.name);

    /**
     * Handles errors by logging them and throwing standardized HTTP exceptions.
     * @param error the error that occurred
     * @param context the context in which the error occurred, used for logging
     * @returns never, throws an appropriate HTTP exception based on the error message
     */
    static toHttpException(error: Error, context: string): never {
        this.LOGGER.error(`Error in ${context}: ${error.message}`, error.stack);
        if (error.message.includes("not found")) {
            throw new NotFoundException(error.message);
        }
        if (error.message.includes("unauthorized") || error.message.includes("not logged in")) {
            throw new UnauthorizedException(error.message);
        }
        if (error.message.includes("forbidden") || error.message.includes("not allowed")) {
            throw new ForbiddenException(error.message);
        }
        if (error.message.includes("invalid") || error.message.includes("required")) {
            throw new BadRequestException(error.message);
        }
        throw new InternalServerErrorException("An unexpected error occurred");
    }

    /**
     * Validates that the request is authenticated and contains a valid user.
     * @param req the authenticated request to validate
     * @throws UnauthorizedException if the request is not authenticated or does not contain a valid user
     */
    static validateAuthenticatedRequest(req: AuthenticatedRequest): void {
        if (!req) {
            throw new UnauthorizedException("Request not found");
        }
        if (!req.user) {
            throw new UnauthorizedException("User not found in request");
        }
        if (!req.user.id) {
            throw new UnauthorizedException("User does not have valid ID");
        }
    }
}