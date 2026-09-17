import { Controller, Get, Inject } from "@nestjs/common";
import { AppService } from "./app.service.js";
import type { BootstrapStatus } from "./app.service.js";

@Controller()
export class AppController {
  public constructor(
    @Inject(AppService) private readonly appService: AppService,
  ) {}

  @Get()
  public getBootstrapStatus(): BootstrapStatus {
    return this.appService.getBootstrapStatus();
  }
}
