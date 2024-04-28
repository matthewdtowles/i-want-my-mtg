import express from "express";
import { CardSet } from "../models/CardSet";
import { Set } from "../models/Set";
import { ConfigService } from "../services/configService";
import { SetService } from "../services/setService";

const router = express.Router();

router.get('/', async (req, res) => {
    // Initialize ConfigService and SetService
    const configService = new ConfigService(/* pass required parameters */);
    const setService = new SetService(configService);

    // Request a set
    const setName = 'KLD';
    try {
        console.log(`Chosen set code: ${setName}`);
        const setData: Set = await setService.requestSet(setName);
        const cards: CardSet[] = setData.cards;
        console.log(`cards.length: ${cards.length}`);
        // for (const card of cards) {
        //     if (parseInt(card.number) > setData.baseSetSize) {
        //         break;
        //     }
        //     console.log(`${card.number}. ${card.name} -- ${card.manaCost}`);
        // }
        // console.log(setData.baseSetSize);
        res.render('index', {cards: cards});
    } catch (error) {
        console.error("Error fetching set:", error);
        res.render('error');
    }
});

// router.get('/sets', (req, res) => {
//     res.render('sets');
// });

export default router;