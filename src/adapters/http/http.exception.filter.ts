import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { Response } from "express";
import { ActionStatus } from "src/adapters/http/action-status.enum";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    private readonly LOGGER = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        this.LOGGER.error(`HttpException ${exception.message}`, exception.stack);
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const _status: number = exception.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;
        if (this.isApiRequest(request)) {
            response.status(_status).json({
                statusCode: _status,
                timestamp: new Date().toISOString(),
                path: request.url,
                message: exception.message || "Internal Server Error",
                status: ActionStatus.ERROR,
            });
        } else {
            const template = this.getErrorTemplate(exception);
            response.status(_status).render(template, {
                status: ActionStatus.ERROR,
                message: exception.message || "Internal Server Error",
                statusCode: _status,
                breadcrumbs: [],
                authenticated: false,
            });
        }
    }

    private isApiRequest(request: Request): boolean {
        return request.headers["accept"]?.includes("application/json") ||
            request.headers["content-type"]?.includes("application/json");
    }

    private getErrorTemplate(exception: HttpException): string {
        if (exception instanceof NotFoundException) {
            return "errors/404";
        }
        if (exception instanceof UnauthorizedException) {
            return "errors/401";
        }
        return "errors/500";
    }
}
