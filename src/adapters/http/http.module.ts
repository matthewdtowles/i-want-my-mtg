import { Logger, Module } from '@nestjs/common';
import { CardMapper } from 'src/core/card/card.mapper';
import { CoreModule } from 'src/core/core.module';
import { CardController } from './card.controller';
import { InventoryController } from './inventory.controller';
import { SetController } from './set.controller';
import { UserController } from './user.controller';
import { AuthController } from './auth/auth.controller';

@Module({
    controllers: [
        AuthController,
        CardController,
        InventoryController,
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
