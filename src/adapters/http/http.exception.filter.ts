import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { Response } from "express";
import { ActionStatus } from "src/adapters/http/http.types";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    private readonly LOGGER = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        this.LOGGER.error(`HttpException ${exception.stack}`);
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const _status: number = exception.getStatus
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        response.status(_status).render("error", {
            status: ActionStatus.ERROR,
            message: exception.message || "Internal Server Error",
        });
    }
}
