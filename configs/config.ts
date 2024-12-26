import { XrayOutbound } from "./outbound.types.ts";

export interface XrayConfig {
  log: object;
  api?: object;
  dns?: object;
  routing: object;
  policy?: object;
  inbounds: [];
  outbounds: XrayOutbound[];
  stats?: object;
  reverse?: object;
  fakedns?: object;
  metrics?: object;
  observatory?: object;
  burstObservatory?: object;
}

export const isXrayConfig = (obj: unknown): obj is XrayConfig => {
  return obj !== null && typeof obj === 'object' && 'outbounds' in obj;
}