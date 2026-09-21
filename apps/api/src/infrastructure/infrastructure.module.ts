import { Module } from "@nestjs/common";
import { DEPENDENCY_HEALTH_PROBES } from "./dependency-health.js";
import { InfrastructureService } from "./infrastructure.service.js";

@Module({
  providers: [
    InfrastructureService,
    {
      provide: DEPENDENCY_HEALTH_PROBES,
      useExisting: InfrastructureService,
    },
  ],
  exports: [DEPENDENCY_HEALTH_PROBES],
})
export class InfrastructureModule {}
