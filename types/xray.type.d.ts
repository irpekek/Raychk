import { Outbound } from "./outbound.type.d.ts";

export interface XrayConfiguration {
  log: object;
  api?: object;
  dns?: object;
  routing: object;
  policy?: object;
  inbounds: [];
  outbounds: Outbound[];
  stats?: object;
  reverse?: object;
  fakedns?: object;
  metrics?: object;
  observatory?: object;
  burstObservatory?: object;
}
