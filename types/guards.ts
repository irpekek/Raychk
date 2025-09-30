import { TrojanProxy, VlessProxy, VmessProxy, Proxy } from './proxy.type.d.ts';
import { XrayConfiguration } from './xray.type.d.ts';

export const hasProxies = (obj: unknown): obj is { proxies: Proxy[] } => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'proxies' in obj &&
    obj.proxies != null &&
    Array.isArray(obj.proxies) &&
    obj.proxies.length > 0 &&
    obj.proxies.every(
      (proxy) => proxy !== null && typeof proxy === 'object' && 'type' in proxy,
    )
  );
};

export const isXrayConfig = (obj: unknown): obj is XrayConfiguration => {
  return obj !== null && typeof obj === 'object' && 'outbounds' in obj;
};

export const isProxy = (obj: unknown): obj is Proxy => {
  return obj !== null && typeof obj === 'object' && 'type' in obj;
};

export const isVless = (obj: unknown): obj is VlessProxy => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    obj.type === 'vless'
  );
};

export const isVmess = (obj: unknown): obj is VmessProxy => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    obj.type === 'vmess'
  );
};

export const isTrojan = (obj: unknown): obj is TrojanProxy => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    obj.type === 'trojan'
  );
};

export const isWebsocket = (
  config: VlessProxy | VmessProxy | TrojanProxy,
): boolean => {
  return config.network === 'ws' ? true : false;
};

export const isGRPC = (
  config: VlessProxy | VmessProxy | TrojanProxy,
): boolean => {
  return config.network === 'grpc' ? true : false;
};

export const isTLS = (
  config: VlessProxy | VmessProxy | TrojanProxy,
): boolean => {
  if ('sni' in config) return true;
  return 'tls' in config && config.tls === true ? true : false;
};
