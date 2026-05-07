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

const REQUIRED_PROD_ENV = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_MONTHLY',
    'STRIPE_PRICE_ANNUAL',
] as const;

function assertProdEnv(): void {
    if (process.env.NODE_ENV !== 'production') return;
    const missing = REQUIRED_PROD_ENV.filter((k) => !process.env[k]?.trim());
    if (missing.length > 0) {
        throw new Error(
            `Missing required production env vars: ${missing.join(', ')}. ` +
                `Check the deploy pipeline's GitHub secrets and deploy.sh.`
        );
    }
}

async function bootstrap() {
    assertProdEnv();
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

    // OpenAPI spec — generated in all envs and served at /api/openapi.json so the
    // Redoc page at /developer/docs can load it in production. Swagger UI itself
    // (/api/docs) stays non-prod only; the public-facing docs live in the developer portal.
    const swaggerConfig = new DocumentBuilder()
        .setTitle('I Want My MTG API')
        .setDescription('REST API for Magic: The Gathering collection tracking')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig, {
        include: [ApiModule],
    });
    server.get('/api/openapi.json', (_req, res) => {
        res.set('Cache-Control', 'public, max-age=3600');
        res.json(openApiDocument);
    });

    // Public spec for the RapidAPI marketplace listing: read-only catalog endpoints
    // only (cards, sets, sealed-products GETs). User-scoped routes (inventory,
    // portfolio, transactions, alerts, auth, billing, api-keys) are stripped, as is
    // the Bearer security scheme — RapidAPI auth is handled by their proxy.
    const publicOpenApiDocument = buildPublicSpec(openApiDocument);
    server.get('/api/openapi-public.json', (_req, res) => {
        res.set('Cache-Control', 'public, max-age=3600');
        res.json(publicOpenApiDocument);
    });

    if (process.env.NODE_ENV !== 'production') {
        SwaggerModule.setup('api/docs', app, openApiDocument);
    }

    app.use(new CorrelationIdMiddleware().use);
    app.useGlobalInterceptors(new UserContextInterceptor());
    await app.listen(3000);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPublicSpec(doc: any): any {
    const PUBLIC_PATH_PREFIXES = ['/api/v1/cards', '/api/v1/sets', '/api/v1/sealed-products'];
    const clone = JSON.parse(JSON.stringify(doc));
    for (const path of Object.keys(clone.paths || {})) {
        const isPublic = PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p));
        if (!isPublic) {
            delete clone.paths[path];
            continue;
        }
        // Only expose GETs; everything else (POST/PATCH/DELETE on inventory/sealed) is gated.
        for (const method of Object.keys(clone.paths[path])) {
            if (method.toLowerCase() !== 'get') delete clone.paths[path][method];
        }
        if (Object.keys(clone.paths[path]).length === 0) delete clone.paths[path];
    }
    if (clone.components?.securitySchemes) delete clone.components.securitySchemes;
    delete clone.security;
    clone.info = clone.info || {};
    clone.info.title = 'I Want My MTG — Public API';
    clone.info.description =
        'Read-only catalog endpoints (cards, sets, sealed products, prices, price history). ' +
        'No authentication required when called via the RapidAPI marketplace.';
    return clone;
}

bootstrap();
