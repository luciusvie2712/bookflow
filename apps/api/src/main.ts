import "reflect-metadata";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import type { ApiConfig } from "./config/api-config.js";
import { API_CONFIG } from "./config/config.module.js";
import { loadApiEnvironmentFiles } from "./config/environment-loader.js";
import { GlobalExceptionFilter } from "./http/global-exception.filter.js";
import { JsonLogger } from "./logging/json-logger.js";

async function bootstrap(): Promise<void> {
  loadApiEnvironmentFiles();

  const bootstrapLogger = new JsonLogger("log");
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    bufferLogs: true,
    logger: bootstrapLogger,
  });
  const config = app.get<ApiConfig>(API_CONFIG);
  const logger = new JsonLogger(config.logLevel);

  app.useLogger(logger);
  app.use(helmet());
  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "health/live", method: RequestMethod.GET },
      { path: "health/ready", method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));
  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("BookFlow API")
      .setDescription("BookFlow public API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(config.port, config.host);
  logger.log(
    `BookFlow API listening on http://${config.host}:${config.port}/api/v1`,
    "application.started",
  );
}

try {
  await bootstrap();
} catch (error) {
  new JsonLogger("error").error(
    error instanceof Error ? error : new Error(String(error)),
    "application.startup_failed",
  );
  process.exitCode = 1;
}
