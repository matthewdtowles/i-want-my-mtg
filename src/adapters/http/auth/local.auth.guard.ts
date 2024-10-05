import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Trigger local auth strategy to validate email and password during login
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {

    private readonly LOGGER: Logger = new Logger(LocalAuthGuard.name);

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        if (err || !user) {
            if (err) {
                this.LOGGER.error(err);
                throw err;
            }
            this.LOGGER.error(`Unauthorized user in request`);
            throw new UnauthorizedException();
        }
        return user;
    }
}