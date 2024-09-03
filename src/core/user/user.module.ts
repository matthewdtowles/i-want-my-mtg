import { Logger, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { UserRepository } from 'src/adapters/database/user.repository';
import { UserRepositoryPort } from './ports/user.repository.port';
import { UserServicePort } from './ports/user.service.port';
import { UserMapper } from './user.mapper';
import { UserService } from './user.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [
        DatabaseModule,
        InventoryModule,
    ],
    providers: [
        {
            provide: UserServicePort,
            useClass: UserService,
        },
        {
            provide: UserRepositoryPort,
            useClass: UserRepository,
        },
        UserMapper,
    ],
    exports: [
        UserRepositoryPort,
        UserServicePort,
    ]
})
export class UserModule {
    private readonly LOGGER: Logger = new Logger(UserModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
