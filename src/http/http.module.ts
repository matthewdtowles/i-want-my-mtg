import { Module } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';
import { SetController } from './set/set.controller';
import { CardController } from './card/card.controller';
import { UserController } from './user/user.controller';
import { CollectionController } from './collection/collection.controller';
import { CardMapper } from './card/card.mapper';
import { SetMapper } from './set/set.mapper';

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
export class HttpModule {}
