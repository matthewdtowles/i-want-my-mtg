import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from 'src/core/card/card.entity';
import { Collection } from 'src/core/collection/collection.entity';
import { Set } from '../../core/set/set.entity';
import { User } from '../../core/user/user.entity';
import { CardRepository } from './card.repository';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { CollectionRepository } from './collection.repository';
import { CollectionRepositoryPort } from 'src/core/collection/ports/collection.repository.port';
import { SetRepository } from './set.repository';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';
import { UserRepository } from './user.repository';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';

@Module({
    imports: [
        TypeOrmModule.forFeature(
            [
                Card,
                Collection,
                Set,
                User,
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
export class DatabaseModule {
    private readonly LOGGER: Logger = new Logger(DatabaseModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
