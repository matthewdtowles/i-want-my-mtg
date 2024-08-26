import { Logger, Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { CommandModule } from 'nestjs-command';
import { IngestionCliModule } from './ingestion/ingestion.cli.module';

@Module({
  imports: [
    AppModule,
    CommandModule,
    IngestionCliModule,
  ],
})
export class CliModule {
    private readonly LOGGER: Logger = new Logger(CliModule.name);
}
