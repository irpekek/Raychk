import { StreamSetting } from './transport.type.d.ts';

export type protocol = 'http' | 'socks';

export type Inbound = {
  listen: string;
  port: number;
  protocol: protocol;
  settings: SettingInbound;
  streamSettings: StreamSetting;
  tag: string;
  sniffing: SniffingInbound;
  allocate: AllocateInbound;
};

export type SettingInbound = object; // TODO: add setting

export type SniffingInbound = {
  enabled: boolean;
  destOverride: string[];
};

export type AllocateInbound = {
  strategy: string;
  refresh: number;
  concurrency: number;
};
