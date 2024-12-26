type Protocol = 'vmess' | 'vless' | 'trojan';
type Network = 'raw' | 'grpc' | 'ws';
type StreamSecurity = 'none' | 'tls';
type TProxy = 'redirect' | 'tproxy' | 'off';
type VlessEncryption = 'none';
type VmessSecurity = 'auto' | 'none' | 'zero';
type RAWSettingHeader = 'none';

export interface XrayOutbound {
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
// * VMESS SET
export interface VmessSetting {
  vnext: VmessServer[];
}
export interface VmessServer extends BaseServer {
  users: VmessUser[];
}
export interface VmessUser {
  id: string;
  security: VmessSecurity;
  level: number;
}
// * VLESS SET
export interface VlessSetting {
  vnext: VlessServer[];
}
export interface VlessServer extends BaseServer {
  users: VlessUser[];
}
export interface VlessUser extends Omit<VmessUser, 'security'> {
  encryption: VlessEncryption;
  flow: string;
}
// * TROJAN SET
export interface TrojanSetting {
  servers: TrojanServer[];
}
export interface TrojanServer extends BaseServer, TrojanUser { }
export interface TrojanUser {
  password: string;
  email?: string;
  level: number;
}
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
