import { Controller, Get, Render, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  async getIndex(): Promise<object> {
    const setListVal = await this.appService.getIndex();
    return { setList: setListVal };
  }
}
