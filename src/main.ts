import { RawBodyRequest } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import 'dotenv/config';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { ApiModule } from './http/api/api.module';
import { CorrelationIdMiddleware } from './logger/correlation-id.middleware';
import { GlobalAppLogger } from './logger/global-app-logger';
import { UserContextInterceptor } from './logger/user-context.interceptor';

const STRIPE_WEBHOOK_PATH = '/api/v1/billing/webhooks/stripe';

async function bootstrap() {
    const server = express();
    server.use(compression());
    const app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(server),
        { bodyParser: false }
    );

    // Stripe signature verification needs the unparsed request body. Scope raw-body
    // capture to the webhook route only — every other endpoint uses normal JSON/urlencoded
    // parsing so we don't carry a duplicate Buffer around for every request.
    server.use(
        STRIPE_WEBHOOK_PATH,
        express.raw({ type: 'application/json', limit: '1mb' }),
        (req: express.Request, _res: express.Response, next: express.NextFunction) => {
            (req as RawBodyRequest<express.Request>).rawBody = req.body as Buffer;
            next();
        }
    );
    server.use(express.json());
    server.use(express.urlencoded({ extended: true }));

    app.useLogger(GlobalAppLogger);

    const viewsDir = join(__dirname, '.', 'http/views');
    configureApp(app, viewsDir);

    // Swagger / OpenAPI docs - scoped to API controllers only, disabled in production
    if (process.env.NODE_ENV !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('I Want My MTG API')
            .setDescription('REST API for Magic: The Gathering collection tracking')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = SwaggerModule.createDocument(app, swaggerConfig, {
            include: [ApiModule],
        });
        SwaggerModule.setup('api/docs', app, document);
    }

    app.use(new CorrelationIdMiddleware().use);
    app.useGlobalInterceptors(new UserContextInterceptor());
    await app.listen(3000);
}

bootstrap();
