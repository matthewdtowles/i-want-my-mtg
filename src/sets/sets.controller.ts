import { Controller, Get, Param } from '@nestjs/common';

@Controller('sets')
export class SetsController {
    @Get()
    async setListing(): Promise<string> {
        return 'This is the sets page';
    }

    @Get(':setCode')
    async getSetBySetCode(@Param('setCode') setCode: string): Promise<string> {
        setCode = setCode.toUpperCase();
        // return call to the service
        return `Chosen setCode: ${setCode}`;
    }
}
/*
router.get('/sets/:setCode', async (req, res) => {
    // Initialize ConfigService and SetService
    const configService = new ConfigService(pass required parameters);
    const setService = new SetService(configService);

    // Request a set
    const setName = req.params.setCode;
    console.log(`setName chosen: ${setName}`);
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
 */
