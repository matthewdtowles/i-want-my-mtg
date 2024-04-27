import { ConfigService } from "./configService";
import { CardSet } from "./models/CardSet";
import { Set } from "./models/Set";
import { SetService } from "./setService";

async function main() {
    // Initialize ConfigService and SetService
    const configService = new ConfigService(/* pass required parameters */);
    const setService = new SetService(configService);

    // Request a set
    const setName = 'KLD';
    try {
        console.log(`Chosen set code: ${setName}`);
        const setData = await setService.requestSet(setName);
        const cards: CardSet[] = setData.cards;
        
        for (const card of cards) {
            if (parseInt(card.number) > setData.baseSetSize) {
                break;
            }
            console.log(`${card.number}. ${card.name} -- ${card.manaCost}`);
        }
        console.log(setData.baseSetSize);
    } catch (error) {
        console.error("Error fetching set:", error);
    }
}

main();
