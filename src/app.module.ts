import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommandModule } from "nestjs-command";
import { join } from "path";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { DatabaseModule } from "src/infrastructure/database/database.module";
import { DataSource } from "typeorm";
import { AdapterModule } from "./adapters/adapter.module";
import { CoreModule } from "./core/core.module";

@Module({
    imports: [
        ConfigModule.forRoot(),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, "..", "src", "adapters", "http", "public"),
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
                dropSchema: true, // TODO: set to false
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
        AdapterModule,
        CommandModule,
        // MtgJsonIngestionModule, // TODO: Should this be here? - I think it should be here to bind the IngestionServicePort to the MtgJsonIngestionService
    ],
})
export class AppModule {
    private readonly LOGGER: Logger = new Logger(AppModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
