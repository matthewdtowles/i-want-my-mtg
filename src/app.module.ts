import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { DatabaseModule } from "src/infrastructure/database/database.module";
import { DataSource } from "typeorm";
import { CoreModule } from "./core/core.module";
import { HttpModule } from "./http/http.module";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, "..", "src", "http", "public"),
            serveRoot: "/public",
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: "postgres",
                host: configService.get<string>("DB_HOST"),
                port: configService.get<number>("DB_PORT"),
                username: configService.get<string>("DB_USERNAME"),
                password: configService.get<string>("DB_PASSWORD"),
                database: configService.get<string>("DB_NAME"),
                autoLoadEntities: true,
                synchronize: configService.get("NODE_ENV") !== "production",
                dropSchema: false,
                // logging: configService.get("NODE_ENV") !== "production" ? "all" : ["error"],
                logging: false,
                extra: {
                    connectionLimit: 10,
                    queueLimit: 0,
                    waitForConnections: true,
                },
            }),
            dataSourceFactory: async (options) => {
                try {
                    return await new DataSource(options).initialize();
                } catch (error) {
                    console.error("Error initializing the database connection:", error);
                    throw error;
                }
            },
        }),
        DatabaseModule,
        CoreModule,
        HttpModule,
    ],
})
export class AppModule {
    private readonly LOGGER: Logger = new Logger(AppModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
