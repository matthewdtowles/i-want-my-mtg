import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as cookieParser from "cookie-parser";
import { create } from "express-handlebars";
import { join } from "path";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./http/http.exception.filter";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useStaticAssets(join(__dirname, ".", "http/public"), {
        prefix: '/public/',
    });

    app.setBaseViewsDir(join(__dirname, ".", "http/views"));

    const hbs = create({
        layoutsDir: join(__dirname, ".", "http/views", "layouts"),
        partialsDir: join(__dirname, ".", "http/views", "partials"),
        defaultLayout: "main",
        extname: ".hbs",
        helpers: {
            toUpperCase: (str: string) => str.toUpperCase(),
            toLowerCase: (str: string) => str.toLowerCase(),
            capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
        },
    });
    app.engine("hbs", hbs.engine);
    app.setViewEngine("hbs");
    app.use(cookieParser());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
            exceptionFactory: (errors) => {
                const firstError = errors[0];
                const firstConstraint = Object.values(firstError.constraints || {})[0];
                return new Error(makeUserFriendly(firstConstraint || "Validation failed"));
            }
        }),
    );
    await app.listen(3000);
}

function makeUserFriendly(message: string): string {
    console.error(`Validation error: ${message}`);
    message = message?.toLowerCase();
    if (message.includes("email")) return "Please provide a valid email address";
    if (message.includes("empty")) return "This field is required";
    if (message.includes("length")) return "Name must be at least 6 characters";
    if (message.includes("password")) return "Password must contain uppercase, lowercase, number and special character";
    if (message.includes("string")) return "Please provide valid text";
    return message?.charAt(0).toUpperCase() + message?.slice(1) || "An error occurred";
}

bootstrap();
