import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getLogger } from 'src/logger/global-app-logger';
import { EmailService } from './email.service';

@Module({
    imports: [ConfigModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {
    private readonly LOGGER = getLogger(EmailModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
