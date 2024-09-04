import { Inject, Injectable, Logger } from "@nestjs/common";
import { UserServicePort } from "src/core/user/ports/user.service.port";

@Injectable()
export class UserCli {

    private readonly LOGGER: Logger = new Logger(UserCli.name);

    constructor(
        @Inject(UserServicePort) private readonly service: UserServicePort
    ) { }

    
}