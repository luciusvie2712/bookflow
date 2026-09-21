import { Global, Module } from "@nestjs/common";
import { parseApiEnvironment } from "./api-config.js";

export const API_CONFIG = Symbol("API_CONFIG");

@Global()
@Module({
  providers: [
    {
      provide: API_CONFIG,
      useFactory: () => parseApiEnvironment(process.env),
    },
  ],
  exports: [API_CONFIG],
})
export class ConfigModule {}
