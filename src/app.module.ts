import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { CoreModule } from "./core/core.module";
import { AdapterModule } from "./adapters/adapter.module";
import { CommandModule } from "nestjs-command";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "mysql",
        host: configService.get<string>("DB_HOST"),
        port: configService.get<number>("DB_PORT"),
        username: configService.get<string>("DB_USERNAME"),
        password: configService.get<string>("DB_PASSWORD"),
        database: configService.get<string>("DB_NAME"),
        autoLoadEntities: true,
        synchronize: configService.get("NODE_ENV") !== "production",
        dropSchema: true,
        //dropSchema: false,
        logging:
          configService.get("NODE_ENV") !== "production" ? "all" : ["error"],
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
