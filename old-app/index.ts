import { ConfigService } from "./services/ConfigService";
import { CardSet } from "./models/CardSet";
import { Set } from "./models/Set";
import { SetService } from "./services/SetService";
import server from './server';

async function main() {
    // TODO: configurable
    const protocol: string = 'http://';
    const domain: string = 'localhost';
    const port: number = 3000;

    server.listen(port, () => {
        console.log(`Server is running on ${protocol}${domain}:${port}`);
    });
}

main();
