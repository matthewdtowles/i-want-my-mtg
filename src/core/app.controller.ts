import { Controller, Get, Render } from '@nestjs/common';
import { AppService } from './app.service';
import { GetSetDto } from './set/dto/get-set.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  async getIndex(): Promise<{ setList: GetSetDto[] }> { 
    const setListVal = await this.appService.getIndex();
    return { setList: setListVal };
  }
}
