import { Controller, Get, Render, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { SetList } from '../data-ingestion/models/setList.model';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  async getIndex(): Promise<{ setList: SetList[] }> { 
    const setListVal = await this.appService.getIndex();
    return { setList: setListVal };
  }
}
