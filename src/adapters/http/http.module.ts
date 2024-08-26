import { Logger, Module } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';
import { SetController } from './set.controller';
import { CardController } from './card.controller';
import { UserController } from './user.controller';
import { CollectionController } from './collection.controller';
import { CardMapper } from 'src/core/card/card.mapper';

@Module({
    controllers: [
        CardController,
        CollectionController,
        SetController,
        UserController,
    ],
    imports: [
        CoreModule,
    ],
    providers: [
        CardMapper,
    ],
    exports: [
        CoreModule,
    ],
})
export class HttpModule {
    private readonly LOGGER: Logger = new Logger(HttpModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
