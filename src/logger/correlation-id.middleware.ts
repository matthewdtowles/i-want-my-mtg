import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from './request-context';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: AuthenticatedRequest, res: any, next: () => void) {
        RequestContext.run({ correlationId: uuidv4() }, next);
    }
}
