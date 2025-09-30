import { StreamSetting } from "./transport.type.d.ts";
import { TrojanSetting } from "./trojan.type.d.ts";
import { VlessSetting } from "./vless.type.d.ts";
import { VmessSetting } from "./vmess.type.d.ts";

export type Protocol = 'vmess' | 'vless' | 'trojan';

export interface Outbound {
  sendThrough?: string;
  protocol: Protocol;
  settings: VmessSetting | VlessSetting | TrojanSetting;
  tag: string;
  streamSettings: StreamSetting;
  proxySettings?: object;
  mux?: object;
}

interface BaseServer {
  address: string;
  port: number;
}
