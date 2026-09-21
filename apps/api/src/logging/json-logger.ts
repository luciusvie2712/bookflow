import type { LoggerService } from "@nestjs/common";

type LogLevel = "debug" | "log" | "warn" | "error" | "fatal";

const levelPriority: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  log: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

export class JsonLogger implements LoggerService {
  public constructor(private readonly minimumLevel: LogLevel = "log") {}

  public log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("log", message, optionalParams);
  }

  public error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  public warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  public debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  public verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  public fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write("fatal", message, optionalParams);
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: readonly unknown[],
  ): void {
    if (levelPriority[level] < levelPriority[this.minimumLevel]) {
      return;
    }

    const context = optionalParams.find(
      (parameter): parameter is string => typeof parameter === "string",
    );
    const error =
      message instanceof Error
        ? { name: message.name, message: message.message, stack: message.stack }
        : undefined;
    const fields = this.isRecord(message)
      ? message
      : { message: error?.message ?? String(message) };
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event: context ?? "application",
      ...fields,
      ...(error === undefined ? {} : { error }),
    };

    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }

  private isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
