import { Logger, Module } from "@nestjs/common";
import { CoreModule } from "src/core/core.module";

@Module({
    imports: [CoreModule],
    providers: [

    ],
    exports: [

    ],    
})
export class CoreCliModule {
    private readonly LOGGER: Logger = new Logger(CoreCliModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}