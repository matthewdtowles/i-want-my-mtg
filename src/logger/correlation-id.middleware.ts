import { Injectable, NestMiddleware } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { RequestContext } from "./request-context";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: any, res: any, next: () => void) {
        RequestContext.run({ correlationId: uuidv4(), userId: req.user?.id }, next);
    }
}