import { Module } from '@nestjs/common';
import { CardModule } from './card/card.module';
import { CollectionModule } from './collection/collection.module';
import { SetModule } from './set/set.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        CardModule,
        CollectionModule,
        SetModule,
        UserModule,
    ],
    exports: [
        CardModule,
        CollectionModule,
        SetModule,
        UserModule,
    ]
})
export class CoreModule {}