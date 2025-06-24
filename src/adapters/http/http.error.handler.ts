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


export class HttpErrorHandler {
    private static readonly LOGGER: Logger = new Logger(HttpErrorHandler.name);

    static typedErrorView<T extends BaseViewDto>(
        ViewClass: new (data: any) => T,
        error: Error,
        data: Record<string, any> = {}
    ): T {
        this.LOGGER.error(`Error in ${ViewClass.name}: ${error.message}`, error.stack);
        return new ViewClass({
            authenticated: false,
            breadcrumbs: [{ label: "Home", url: "/" }],
            message: `Error: ${error.message}`,
            status: ActionStatus.ERROR,
            ...data,
        });
    }

    static handleError(error: Error, context: string): never {
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