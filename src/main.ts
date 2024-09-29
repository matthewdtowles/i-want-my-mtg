import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { create } from 'express-handlebars';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useStaticAssets(join(__dirname, '.', 'adapters/http/public'));
    app.setBaseViewsDir(join(__dirname, '.', 'adapters/http/views'));

    const hbs = create({
        layoutsDir: join(__dirname, '.', 'adapters/http/views', 'layouts'),
        partialsDir: join(__dirname, '.', 'adapters/http/views', 'partials'),
        defaultLayout: 'main',
        extname: '.hbs',
    });
    app.engine('hbs', hbs.engine);
    app.setViewEngine('hbs');

    app.useGlobalPipes(new ValidationPipe());

    await app.listen(3000);
}
bootstrap();

