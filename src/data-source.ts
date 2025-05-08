import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + "/**/*.entity{.ts,.js}"],
    migrations: [__dirname + "/infrastructure/migrations/*{.ts,.js}"],
    synchronize: process.env.NODE_ENV !== "production",
    logging: process.env.NODE_ENV !== "production" ? "all" : ["error"],
    dropSchema: false,
    extra: {
        connectionLimit: 10,
        queueLimit: 0,
        waitForConnections: true,
    },
});