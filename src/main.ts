import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';
import { join } from 'path';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { CorrelationIdMiddleware } from './logger/correlation-id.middleware';
import { GlobalAppLogger } from './logger/global-app-logger';
import { UserContextInterceptor } from './logger/user-context.interceptor';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useLogger(GlobalAppLogger);

    const viewsDir = join(__dirname, '.', 'http/views');
    configureApp(app, viewsDir);

    // Swagger / OpenAPI docs
    const swaggerConfig = new DocumentBuilder()
        .setTitle('I Want My MTG API')
        .setDescription('REST API for Magic: The Gathering collection tracking')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    app.use(new CorrelationIdMiddleware().use);
    app.useGlobalInterceptors(new UserContextInterceptor());
    await app.listen(3000);
}

bootstrap();
