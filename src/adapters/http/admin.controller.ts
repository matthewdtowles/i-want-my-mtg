import { Controller, Inject, Logger } from "@nestjs/common";

@Controller("admin")
export class AdminController {
  private readonly LOGGER: Logger = new Logger(AdminController.name);

  constructor(
    @Inject(AdminServicePort) private readonly adminService: AdminServicePort,
  ) {}
}
