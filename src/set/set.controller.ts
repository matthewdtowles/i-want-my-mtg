import { Controller, Get, Param, Render } from '@nestjs/common';
import { SetService } from './set.service';
import { Set } from 'src/models/set.model';

@Controller('sets')
export class SetController {
    constructor(private readonly setsService: SetService) {}

    @Get()
    async setListing(): Promise<string> {
        // TODO: see the app.controller
        return 'This is the sets page';
    }

    @Get(':setCode')
    @Render('set')
    async findBySetCode(@Param('setCode') setCode: string): Promise<object> {
        setCode = setCode.toUpperCase();
        const set = await this.setsService.findByCode(setCode);
        return set;
    }
}
