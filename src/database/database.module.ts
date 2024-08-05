import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardEntity } from './card/card.entity';
import { UserEntity } from './user/user.entity';
import { SetEntity } from './set/set.entity';
import { CollectionEntity } from './collection/collection.entity';
import { CardRepository } from './card/card.repository';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { CollectionRepository } from './collection/collection.repository';
import { CollectionRepositoryPort } from 'src/core/collection/ports/collection.repository.port';
import { SetRepository } from './set/set.repository';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';
import { UserRepository } from './user/user.repository';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                CardEntity,
                CollectionEntity,
                SetEntity,
                UserEntity,
            ],
        )
    ],
    providers: [
        {
            provide: CardRepositoryPort,
            useClass: CardRepository,
        },
        {
            provide: CollectionRepositoryPort,
            useClass: CollectionRepository,
        },
        {
            provide: SetRepositoryPort,
            useClass: SetRepository,
        },
        {
            provide: UserRepositoryPort,
            useClass: UserRepository
        },
    ],
    exports: [
        CardRepositoryPort,
        CollectionRepositoryPort,
        SetRepositoryPort,
        UserRepositoryPort,
        TypeOrmModule
    ],
})
export class DatabaseModule { }
