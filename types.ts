interface Proxy {
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
  host: string;
}
interface GrpcOpts {
  'grpc-service-name': string;
}
export interface Trojan extends Proxy {
  sni: string;
  password: string;
}

export interface Vmess extends Proxy {
  tls: boolean;
  uuid: string;
  alterid: number;
  cipher?: string;
  servername?: string;
}

export interface Vless extends Proxy {
  tls: boolean;
  uuid: string;
  alterid: number;
  cipher?: string;
  servername?: string;
}


export const isProxy = (obj: unknown): obj is Proxy => {
  return obj !== null && typeof obj === 'object' && 'type' in obj;
};
export const isVless = (obj: unknown): obj is Vless => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    obj.type === 'vless'
  );
};
export const isVmess = (obj: unknown): obj is Vmess => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    obj.type === 'vmess'
  );
};
export const isTrojan = (obj: unknown): obj is Trojan => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    obj.type === 'trojan'
  );
};
export const isWebsocket = (config: Vless | Vmess | Trojan): boolean => {
  return config.network === 'ws' ? true : false;
};
export const isGRPC = (config: Vless | Vmess | Trojan): boolean => {
  return config.network === 'grpc' ? true : false;
};
export const isTLS = (config: Vless | Vmess): boolean => {
  return 'tls' in config && config.tls === true ? true : false;
};
