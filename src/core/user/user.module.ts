import { Logger, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { UserRepository } from 'src/adapters/database/user.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { UserRepositoryPort } from './ports/user.repository.port';
import { UserServicePort } from './ports/user.service.port';
import { UserService } from './user.service';

@Module({
    imports: [
        DatabaseModule,
        InventoryModule, // instead of adding multiple providers to enable inventory mapper
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
