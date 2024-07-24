import { Injectable } from '@nestjs/common';
import { SetService } from '../core/set/set.service';
import { GetSetDto } from './set/dto/get-set.dto';

@Injectable()
export class AppService {
    constructor(private readonly setsService: SetService) { }

    async getIndex(): Promise<GetSetDto[]> {
        // TODO: need a template to loop through the set names and inject them for inclusion to index.hbs
        return await this.setsService.findAll();
    }
}
