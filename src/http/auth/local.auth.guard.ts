import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { getLogger } from 'src/logger/global-app-logger';

/**
 * Trigger local auth strategy to validate email and password during login
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
    private readonly LOGGER = getLogger(LocalAuthGuard.name);

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        this.LOGGER.debug(`LocalAuthGuard canActivate called`);
        return super.canActivate(context);
    }

    handleRequest(err, user, _info) {
        this.LOGGER.debug(`LocalAuthGuard handleRequest called`);
        if (err) {
            this.LOGGER.error(`Error during authentication: ${err.message}`);
            throw err;
        }
        if (!user) {
            this.LOGGER.error(`Unauthorized user in request`);
            throw new UnauthorizedException(`Unauthorized user in request`);
        }
        this.LOGGER.debug(`User authenticated successfully: ${user.email}`);
        return user;
    }
}
