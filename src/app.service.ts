import { Injectable } from '@nestjs/common';
import { ConfigService } from './config/config.service';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getIndex(): string {
    return `Hello ${this.configService.get('APP_NAME')}`;
  }
}
