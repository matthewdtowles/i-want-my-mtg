import {
    BadRequestException,
    ForbiddenException, InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';


export class HttpErrorHandler {
    private static readonly LOGGER: Logger = new Logger(HttpErrorHandler.name);

    static handleError(error: Error, context: string): never {
        this.LOGGER.error(`Error in ${context}: ${error.message}`, error.stack);
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
}