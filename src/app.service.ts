import { Injectable } from '@nestjs/common';
import { SetsService } from './sets/sets.service';

@Injectable()
export class AppService {
  constructor(private readonly setsService: SetsService
  ) {}

  async getIndex(): Promise<string[]> {
    // TODO: need a template to loop through the set names and inject them for inclusion to index.hbs
    return await this.setsService.requestSetList();
  }
}
