import { Injectable } from "@nestjs/common";
import { DOMAIN_EVENT_NAMES } from "@bookflow/domain-contracts";

export type BootstrapStatus = Readonly<{
  application: "bookflow-api";
  eventContract: string;
  status: "ok";
}>;

@Injectable()
export class AppService {
  public getBootstrapStatus(): BootstrapStatus {
    return {
      application: "bookflow-api",
      eventContract: DOMAIN_EVENT_NAMES.bookingCreated,
      status: "ok",
    };
  }
}
