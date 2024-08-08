import { Module } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';
import { SetController } from './set/set.controller';
import { CardController } from './card/card.controller';
import { UserController } from './user/user.controller';
import { CollectionController } from './collection/collection.controller';

@Module({
    controllers: [
        CardController,
        CollectionController,
        SetController,
        UserController,
    ],
    imports: [
        CoreModule
    ],
    exports: [
        CoreModule
    ],
})
export class HttpModule {}
