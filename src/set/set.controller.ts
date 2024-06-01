import { Controller, Get, Param, Render } from '@nestjs/common';
import { SetService } from './set.service';
import { Set } from 'src/models/set.model';
import { CardSet } from 'src/models/cardSet.model';

@Controller('sets')
export class SetController {
    constructor(private readonly setsService: SetService) {}

    @Get()
    async setListing(): Promise<string> {
        // TODO: see the app.controller
        return 'This is the sets page';
    }

    @Get(':setCode')
    @Render('cardSet')
    async getSetBySetCode(@Param('setCode') setCode: string): Promise<{ cards: CardSet[] }> {
        setCode = setCode.toUpperCase();
        const cards = await this.setsService.requestSet(setCode);
        return { cards: cards };
    }
}
