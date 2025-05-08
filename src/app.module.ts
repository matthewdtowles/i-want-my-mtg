import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommandModule } from "nestjs-command";
import { join } from "path";
import { AdapterModule } from "./adapters/adapter.module";
import { CoreModule } from "./core/core.module";
import { AppDataSource } from "./data-source";

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
            useFactory: async (configService: ConfigService) => ({
                type: "postgres",
                host: configService.get<string>("DB_HOST"),
                port: configService.get<number>("DB_PORT"),
                username: configService.get<string>("DB_USERNAME"),
                password: configService.get<string>("DB_PASSWORD"),
                database: configService.get<string>("DB_NAME"),
                autoLoadEntities: true,
                synchronize: configService.get("NODE_ENV") !== "production",
            }),
            dataSourceFactory: async () => {
                try {
                    return await AppDataSource.initialize();
                } catch (error) {
                    console.error("Error initializing the database connection:", error);
                    throw error;
                }
            },
        }),
        CoreModule,
        AdapterModule,
        CommandModule,
    ],
})
export class AppModule {
    private readonly LOGGER: Logger = new Logger(AppModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
