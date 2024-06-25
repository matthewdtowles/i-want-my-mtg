import { Controller, Get, Param, Render } from '@nestjs/common';
import { SetService } from './set.service';
import { SetList } from 'src/models/setList.model';
import { SetResponse } from './set.response.model';

@Controller('sets')
export class SetController {
    constructor(private readonly setsService: SetService) {}

    @Get()
    @Render('setListPage')
    async setListing(): Promise<{ setList: SetList[] }> {
        const setListVal = await this.setsService.findAll();
        return { setList: setListVal };
    }

    @Get(':setCode')
    @Render('set')
    async findBySetCode(@Param('setCode') setCode: string): Promise<SetResponse> {
        setCode = setCode.toUpperCase();
        const set = await this.setsService.findByCode(setCode);
        console.log(`set: ${set}`);
        return set;
    }
}
