import { Injectable } from '@nestjs/common';
import { SetsService } from './sets/sets.service';
import { SetList } from './models/setList.model';

@Injectable()
export class AppService {
  constructor(private readonly setsService: SetsService
  ) {}

  async getIndex(): Promise<SetList[]> {
    // TODO: need a template to loop through the set names and inject them for inclusion to index.hbs
    return await this.setsService.requestSetList();
  }
}
