import { Controller, Get, Param, Render } from '@nestjs/common';
import { SetService } from '../../core/set/set.service';
import { Set } from 'src/core/set/entities/set.entity';
import { SetResponse } from './set.response.model';
import { GetSetDto } from './get-set.dto';
import { SetMapper } from './set.mapper';

@Controller('sets')
export class SetController {
    constructor(
        private readonly setsService: SetService,
        private readonly setMapper: SetMapper,
    ) {}

    @Get()
    @Render('setListPage')
    async setListing(): Promise<{ setList: GetSetDto[] }> {
        const setListVal = await this.setsService.findAll();
        const sets = this.setMapper.entitiesToDtos(await this.setsService.findAll());
        return { setList: sets };
    }

    @Get(':setCode')
    @Render('set')
    async findBySetCode(@Param('setCode') setCode: string): Promise<GetSetDto> {
        setCode = setCode.toUpperCase();
        const set = await this.setsService.findByCode(setCode);
        return this.setMapper.entityToDto(set);
    }
}
