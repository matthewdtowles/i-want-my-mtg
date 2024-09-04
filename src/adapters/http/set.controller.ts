import { Controller, Get, Inject, Logger, Param, Render } from '@nestjs/common';
import { CardDto } from 'src/core/card/dto/card.dto';
import { CardServicePort } from 'src/core/card/ports/card.service.port';
import { SetDto } from 'src/core/set/dto/set.dto';
import { SetServicePort } from 'src/core/set/ports/set.service.port';

@Controller('sets')
export class SetController {

    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(
        @Inject(SetServicePort) private readonly setService: SetServicePort,
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
    ) { }

    @Get()
    @Render('setListPage')
    async setListing(): Promise<{ setList: SetDto[] }> {
        this.LOGGER.debug(`get setListing`);
        return { setList: await this.setService.findAll() };
    }

    @Get(':setCode')
    @Render('set')
    async findBySetCode(@Param('setCode') setCode: string): Promise<SetDto> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
        setCode = setCode.toUpperCase();
        return await this.setService.findByCode(setCode);
    }

    @Get(':setCode/:setNumber')
    @Render('set')
    async findSetCard(
        @Param('setCode') setCode: string,
        @Param('setNumber') setNumber: number
    ): Promise<CardDto> {
        this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
        setCode = setCode.toUpperCase();
        return await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
    }
}
