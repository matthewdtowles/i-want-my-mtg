import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { create } from 'express-handlebars';
import { join } from 'path';
import { HttpExceptionFilter } from './http/http.exception.filter';

/**
 * Shared app configuration used by both bootstrap (main.ts) and integration test setup.
 * Keeps Handlebars helpers, validation pipe, filters, and middleware in sync.
 */
export function configureApp(app: INestApplication, viewsDir: string): void {
    const expressApp = app as NestExpressApplication;

    expressApp.useStaticAssets(join(viewsDir, '..', 'public'), {
        prefix: '/public/',
    });
    expressApp.setBaseViewsDir(viewsDir);

    const hbs = create({
        layoutsDir: join(viewsDir, 'layouts'),
        partialsDir: join(viewsDir, 'partials'),
        defaultLayout: 'main',
        extname: '.hbs',
        helpers: {
            toUpperCase: (str: string) => str.toUpperCase(),
            toLowerCase: (str: string) => str.toLowerCase(),
            capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
            eq: (a: any, b: any) => a === b,
            gt: (a: any, b: any) => a > b,
            lt: (a: any, b: any) => a < b,
            encodeURIComponent: (str: string) => encodeURIComponent(str || ''),
        },
    });
    expressApp.engine('hbs', hbs.engine);
    expressApp.setViewEngine('hbs');
    expressApp.use(cookieParser());
    expressApp.useGlobalFilters(new HttpExceptionFilter());
    expressApp.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
            exceptionFactory: (errors) => {
                const firstError = errors[0];
                const firstConstraint = Object.values(firstError.constraints || {})[0];
                return new BadRequestException(
                    makeUserFriendly(firstConstraint || 'Validation failed')
                );
            },
        })
    );
}

function makeUserFriendly(message: string): string {
    console.error(`Validation error: ${message}`);
    if (isCustomMessage(message)) return message;
    const lower = message?.toLowerCase();
    if (lower.includes('email')) return 'Please provide a valid email address';
    if (lower.includes('empty')) return 'This field is required';
    if (lower.includes('length')) return 'Name must be at least 6 characters';
    if (lower.includes('password'))
        return 'Password must contain uppercase, lowercase, number and special character';
    if (lower.includes('string')) return 'Please provide valid text';
    return lower?.charAt(0).toUpperCase() + lower?.slice(1) || 'An error occurred';
}

function isCustomMessage(message: string): boolean {
    if (!message) return false;
    return (
        message.includes('must be') ||
        message.includes('may only') ||
        message.startsWith('Please') ||
        message.startsWith('Password') ||
        message.startsWith('Username') ||
        message.startsWith('Email')
    );
}
