import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'i-want-my-mtg from AppService!';
  }
}
