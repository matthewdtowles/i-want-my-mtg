import {
    BadRequestException,
    ForbiddenException, InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException
} from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/dto/authenticated.request";
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { Breadcrumb } from "src/adapters/http/breadcrumb";


export class HttpErrorHandler {
    private static readonly LOGGER: Logger = new Logger(HttpErrorHandler.name);

    /**
     * For operations that return a view, this method formats the error into a view DTO.
     * It logs the error and returns a view with the error message and status.
     * @param ViewClass the class of type T of the view DTO to return
     * @param error the error that occurred
     * @param data the data injected into the view DTO
     * @param breadcrumbs breadcrumbs to include in the view
     * @returns an instance of the view DTO with error information
     */
    static toErrorView<T extends BaseViewDto>(
        ViewClass: new (data: any) => T,
        error: Error,
        data: Record<string, any> = {},
        breadcrumbs?: Breadcrumb[]
    ): T {
        this.LOGGER.error(`Error in ${ViewClass.name}: ${error.message}`, error.stack);
        return new ViewClass({
            authenticated: false,
            breadcrumbs: breadcrumbs || [{ label: "Home", url: "/" }],
            message: `Error: ${error.message}`,
            status: ActionStatus.ERROR,
            ...data,
        });
    }

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