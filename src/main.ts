import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { create } from 'express-handlebars';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useStaticAssets(join(__dirname, '..', 'http/public'));
    app.setBaseViewsDir(join(__dirname, '..', 'http/views'));

    const hbs = create({
        layoutsDir: join(__dirname, '..', 'http/views', 'layouts'),
        partialsDir: join(__dirname, '..', 'http/views', 'partials'),
        defaultLayout: 'main',
        extname: '.hbs',
    });
    app.engine('hbs', hbs.engine);
    app.setViewEngine('hbs');

    await app.listen(3000);
}
bootstrap();

