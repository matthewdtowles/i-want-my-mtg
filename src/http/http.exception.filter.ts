import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Logger,
    NotFoundException,
    UnauthorizedException
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActionStatus } from "./action-status.enum";
import { LoginFormViewDto } from "./auth/dto/login-form.view.dto";
import { CreateUserViewDto } from "./user/dto/create-user.view.dto";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    private readonly LOGGER = new Logger(HttpExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        this.LOGGER.error(`Exception ${exception.message}`, exception.stack);
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const isHttpException = exception instanceof HttpException;
        const status: number = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        if (this.isApiRequest(request)) {
            response.status(status).json({
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                message: exception.message || "Internal Server Error",
                status: ActionStatus.ERROR,
            });
        } else if (this.isFormRoute(request.url)) {
            this.handleFormError(response, request, exception);
        } else {
            const template = this.getErrorTemplate(exception);
            response.status(status).render(template, {
                status: ActionStatus.ERROR,
                message: exception.message || "Internal Server Error",
                statusCode: status,
                authenticated: false,
            });
        }
    }

    private isApiRequest(request: Request): boolean {
        return request.headers.accept?.includes("application/json") ||
            request.headers["content-type"]?.includes("application/json");
    }

    private isFormRoute(url: string): boolean {
        return url.includes('/user/create') ||
            url.includes('/auth/login') ||
            url.includes('/user/update') ||
            url.includes('/auth/register');
    }

    private handleFormError(response: Response, request: Request, exception: any): void {
        let errorMessage = exception.message || "An error occurred";
        if (exception instanceof UnauthorizedException) {
            errorMessage = "Invalid email or password";
        }
        if (request.url.includes('/user/create')) {
            const errorView = new CreateUserViewDto({
                authenticated: false,
                message: errorMessage,
                status: ActionStatus.ERROR,
                name: request.body?.name || "",
                email: request.body?.email || "",
            });
            response.status(200).render('createUser', errorView);
            return;
        }

        if (request.url.includes('/auth/login')) {
            const errorView = new LoginFormViewDto({
                authenticated: false,
                message: errorMessage,
                status: ActionStatus.ERROR,
                email: request.body?.email || "",
            });
            response.status(200).render('login', errorView);
            return;
        }

        if (request.url.includes('/user/update')) {
            response.status(200).render('user/update', {
                status: ActionStatus.ERROR,
                message: errorMessage,
                authenticated: true,
                formData: request.body || {},
            });
            return;
        }

        response.status(200).render('errors/400', {
            status: ActionStatus.ERROR,
            message: errorMessage,
            authenticated: false,
        });
    }

    private getErrorTemplate(exception: HttpException): string {
        if (exception instanceof NotFoundException) {
            return "errors/404";
        }
        if (exception instanceof UnauthorizedException || exception instanceof ForbiddenException) {
            return "errors/401";
        }
        return "errors/500";
    }
}
