import { Controller, Get, Inject, Param, Render } from '@nestjs/common';
import { SetMapper } from '../../core/set/set.mapper';
import { SetServicePort } from 'src/core/set/ports/set.service.port';
import { SetDto } from 'src/core/set/dto/set.dto';

@Controller('sets')
export class SetController {
    constructor(
        @Inject(SetServicePort) private readonly setService: SetServicePort,
        private readonly setMapper: SetMapper,
    ) {}

    @Get()
    @Render('setListPage')
    async setListing(): Promise<{ setList: SetDto[] }> {
        const setListVal = await this.setService.findAll();
        const sets = this.setMapper.entitiesToDtos(await this.setService.findAll());
        return { setList: sets };
    }

    @Get(':setCode')
    @Render('set')
    async findBySetCode(@Param('setCode') setCode: string): Promise<SetDto> {
        setCode = setCode.toUpperCase();
        const set = await this.setService.findByCode(setCode);
        return this.setMapper.entityToDto(set);
    }
}
