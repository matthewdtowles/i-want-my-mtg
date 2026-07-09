import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    ForbiddenException,
    HttpException,
    HttpStatus,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getLogger } from 'src/logger/global-app-logger';
import { domainErrorToHttpException } from './http.error.handler';
import { InvalidQueryParamException } from './api/shared/query-validation';
import { ApiResponseDto } from './base/api-response.dto';
import { LoginFormViewDto } from './hbs/auth/dto/login-form.view.dto';
import { ActionStatus } from './base/action-status.enum';
import { Toast } from './base/toast';
import { CreateUserViewDto } from './hbs/user/dto/create-user.view.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly LOGGER = getLogger(HttpExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        this.LOGGER.error(`Exception ${exception.message}`, exception.stack);
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        // Normalize domain errors (and pass HttpExceptions through) so API
        // controllers that throw Domain*Error get the right status without a
        // per-controller catch. A null result is a genuinely unexpected error:
        // it drives a 500 on the API and page branches (its message is never
        // exposed to the client - B9); the form-route branch re-renders the form
        // with a 200 regardless (see handleFormError).
        const httpException = domainErrorToHttpException(exception);
        const status: number = httpException
            ? httpException.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const clientMessage: string = httpException
            ? httpException.message
            : 'Internal Server Error';
        if (this.isApiRequest(request)) {
            const body = ApiResponseDto.error(clientMessage);
            if (exception instanceof InvalidQueryParamException) {
                response.status(status).json({
                    ...body,
                    param: exception.param,
                    allowedValues: exception.allowedValues,
                });
            } else {
                response.status(status).json(body);
            }
        } else if (this.isFormRoute(request.url)) {
            this.handleFormError(response, request, httpException, clientMessage);
        } else {
            const template = this.getErrorTemplate(httpException);
            response.status(status).render(template, {
                toast: new Toast(clientMessage, ActionStatus.ERROR),
                statusCode: status,
                authenticated: false,
                returnUrl:
                    httpException instanceof UnauthorizedException ? request.url : undefined,
            });
        }
    }

    private isApiRequest(request: Request): boolean {
        return (
            request.url.startsWith('/api/') ||
            request.headers.accept?.includes('application/json') ||
            request.headers['content-type']?.includes('application/json')
        );
    }

    private isFormRoute(url: string): boolean {
        return (
            url.includes('/user/create') ||
            url.includes('/auth/login') ||
            url.includes('/user/update') ||
            url.includes('/auth/register')
        );
    }

    private handleFormError(
        response: Response,
        request: Request,
        httpException: HttpException | null,
        clientMessage: string
    ): void {
        let errorMessage = clientMessage;
        if (httpException instanceof UnauthorizedException) {
            errorMessage = 'Invalid email or password';
        }
        if (request.url.includes('/user/create')) {
            const errorView = new CreateUserViewDto({
                authenticated: false,
                toast: new Toast(errorMessage, ActionStatus.ERROR),
                name: request.body?.name || '',
                email: request.body?.email || '',
            });
            response.status(200).render('createUser', errorView);
            return;
        }

        if (request.url.includes('/auth/login')) {
            const errorView = new LoginFormViewDto({
                authenticated: false,
                toast: new Toast(errorMessage, ActionStatus.ERROR),
                email: request.body?.email || '',
                returnUrl: request.body?.returnUrl || '',
            });
            response.status(200).render('login', errorView);
            return;
        }

        if (request.url.includes('/user/update')) {
            response.status(200).render('user/update', {
                toast: new Toast(errorMessage, ActionStatus.ERROR),
                authenticated: true,
                formData: request.body || {},
            });
            return;
        }

        response.status(200).render('errors/400', {
            toast: new Toast(errorMessage, ActionStatus.ERROR),
            authenticated: false,
        });
    }

    private getErrorTemplate(exception: HttpException | null): string {
        if (exception instanceof NotFoundException) {
            return 'errors/404';
        }
        if (exception instanceof UnauthorizedException || exception instanceof ForbiddenException) {
            return 'errors/401';
        }
        return 'errors/500';
    }
}
