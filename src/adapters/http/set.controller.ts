import { Controller, Get, Inject, Param, Render } from '@nestjs/common';
import { SetMapper } from '../../core/set/set.mapper';
import { SetServicePort } from 'src/core/set/ports/set.service.port';
import { SetDto } from 'src/core/set/dto/set.dto';

@Controller('sets')
export class SetController {

    constructor(
        @Inject(SetServicePort) private readonly setService: SetServicePort,
    ) {}

    @Get()
    @Render('setListPage')
    async setListing(): Promise<{ setList: SetDto[] }> {
        return { setList: await this.setService.findAll() };
    }

    @Get(':setCode')
    @Render('set')
    async findBySetCode(@Param('setCode') setCode: string): Promise<SetDto> {
        setCode = setCode.toUpperCase();
        return await this.setService.findByCode(setCode);
    }
}
