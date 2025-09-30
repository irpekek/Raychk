type TProxy = 'redirect' | 'tproxy' | 'off';
type RAWSettingHeader = 'none';
type StreamSecurity = 'none' | 'tls';
type Network = 'raw' | 'grpc' | 'ws';
export type Transport = Network;
export type Fingerprint =
  | 'chrome'
  | 'firefox'
  | 'ios'
  | 'android'
  | 'edge'
  | 'safari'
  | '360'
  | 'qq'
  | 'random'
  | 'randomized';

export interface StreamSetting {
  network: Network;
  security?: StreamSecurity;
  tlsSettings?: TLSSetting;
  wsSettings?: WSSetting;
  grpcSettings?: GRPCSetting;
  rawSettings?: RAWSetting;
  sockopt?: SockOptions;
}

export interface TLSSetting {
  serverName: string;
  allowInsecure: boolean;
  alpn: string[];
  fingerprint: string;
}

interface WSSetting {
  path: string;
  host: string;
}

interface GRPCSetting {
  serviceName: string;
}

interface RAWSetting {
  header: RAWSettingHeader;
}

interface SockOptions {
  mark: number;
  tcpFastOpen: boolean;
  tproxy: TProxy;
}
