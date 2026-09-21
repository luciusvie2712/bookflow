import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  HealthService,
  type Liveness,
  type Readiness,
} from "./health.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  public constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get("live")
  @ApiOperation({ summary: "Report whether the API process is alive" })
  public getLiveness(): Liveness {
    return this.healthService.getLiveness();
  }

  @Get("ready")
  @ApiOperation({ summary: "Check required infrastructure dependencies" })
  public getReadiness(): Promise<Readiness> {
    return this.healthService.getReadiness();
  }
}
