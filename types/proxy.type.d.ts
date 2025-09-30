export interface Proxy {
  name: string;
  server: string;
  port: number;
  type: string;
  network: string;
  'skip-cert-verify'?: boolean;
  udp?: boolean;
  'ws-opts'?: WebsocketOpts;
  'grpc-opts'?: GrpcOpts;
}

interface WebsocketOpts {
  path: string;
  headers: WebsocketHeaders;
  host?: string;
}

interface WebsocketHeaders {
  Host: string;
}

interface GrpcOpts {
  'grpc-service-name': string;
}

export interface TrojanProxy extends Proxy {
  sni: string;
  password: string;
}

export interface VmessProxy extends Proxy {
  tls: boolean;
  uuid: string;
  alterid: number;
  cipher?: string;
  servername?: string;
}

export interface VlessProxy extends Proxy {
  tls: boolean;
  uuid: string;
  alterid: number;
  cipher?: string;
  servername?: string;
}
