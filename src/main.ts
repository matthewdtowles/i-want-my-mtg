import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as cookieParser from "cookie-parser";
import { create } from "express-handlebars";
import { join } from "path";
import { HttpExceptionFilter } from "./adapters/http/http.exception.filter";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useStaticAssets(join(__dirname, ".", "adapters/http/public"));
    app.setBaseViewsDir(join(__dirname, ".", "adapters/http/views"));

    const hbs = create({
        layoutsDir: join(__dirname, ".", "adapters/http/views", "layouts"),
        partialsDir: join(__dirname, ".", "adapters/http/views", "partials"),
        defaultLayout: "main",
        extname: ".hbs",
    });
    app.engine("hbs", hbs.engine);
    app.setViewEngine("hbs");

    app.use(cookieParser());

    app.useGlobalFilters(new HttpExceptionFilter());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strip unknown properties
            forbidNonWhitelisted: true, // Throw errors for unknown properties
            transform: true, // Automatically transform payloads to DTO
        }),
    );

    await app.listen(3000);
}
bootstrap();
