import { Logger, Module } from "@nestjs/common";

@Module({
  imports: [
  ],
  exports: [],
})
export class AdminModule {
  private readonly LOGGER: Logger = new Logger(AdminModule.name);

  constructor() {
    this.LOGGER.debug(`Initialized`);
  }
}
