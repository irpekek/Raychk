import { Inbound } from './inbound.type.d.ts';
import { Outbound } from './outbound.type.d.ts';
import { Routing } from './routing.type.d.ts';

export interface XrayConfiguration {
  log: object;
  api?: object;
  dns?: object;
  routing: Routing;
  policy?: object;
  inbounds: Inbound[];
  outbounds: Outbound[];
  stats?: object;
  reverse?: object;
  fakedns?: object;
  metrics?: object;
  observatory?: object;
  burstObservatory?: object;
}
