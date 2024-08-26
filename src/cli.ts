import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import 'tsconfig-paths/register';
import { CliModule } from './cli/cli.module';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(CliModule, {
        logger: ['error', 'debug'],
    });

    app.select(CommandModule).get(CommandService).exec();
}

bootstrap();