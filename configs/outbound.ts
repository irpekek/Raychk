type Protocol = 'vmess' | 'vless' | 'trojan';
type Network = 'raw' | 'grpc' | 'ws';
type StreamSecurity = 'none' | 'tls';
type TProxy = 'redirect' | 'tproxy' | 'off';
type VlessEncryption = 'none';
type VmessSecurity = 'auto' | 'none' | 'zero';
type RAWSettingHeader = 'none';

interface XrayOutbound {
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
interface VmessSetting {
  vnext: VmessServer[];
}
interface VmessServer extends BaseServer {
  users: VmessUser[];
}
interface VmessUser {
  id: string;
  security: VmessSecurity;
  level: number;
}
// * VLESS SET
interface VlessSetting {
  vnext: VlessServer[];
}
interface VlessServer extends BaseServer {
  users: VlessUser[];
}
interface VlessUser extends Omit<VmessUser, 'security'> {
  encryption: VlessEncryption;
  flow: string;
}
// * TROJAN SET
interface TrojanSetting {
  servers: TrojanServer[];
}
interface TrojanServer extends BaseServer, TrojanUser {}
interface TrojanUser {
  password: string;
  email: string;
  level: number;
}
interface StreamSetting {
  network: Network;
  security?: StreamSecurity;
  tlsSettings?: TLSSetting;
  wsSettings?: WSSetting;
  grpcSettings?: GRPCSetting;
  rawSettings?: RAWSetting;
  sockopt?: SockOptions;
}
interface TLSSetting {
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

class Outbound {
  protected _outbound: XrayOutbound[] = [];

  public all(): XrayOutbound[] {
    return this._outbound;
  }

  private save(outbound: XrayOutbound): void {
    this._outbound.push(outbound);
  }

  private hasTag(name: string): boolean {
    const outbounds = this.all();
    const tag = outbounds.find((outbound) => outbound.tag === name);
    return tag ? true : false;
  }

  public vmess(
    name: string,
    id: string,
    server: string,
    port: number,
    tls = false
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const vmess = new Vmess(id, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    if (tls) vmess.raw(tlsSettings);
    else vmess.raw();
    if (vmess.streamSetting && vmess.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'vmess',
        settings: vmess.setting,
        streamSettings: vmess.streamSetting,
      };
      this.save(outbound);
    }
  }

  public vmessWebsocket(
    name: string,
    id: string,
    server: string,
    port: number,
    path: string,
    host: string,
    tls = false
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const vmess = new Vmess(id, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    if (tls) vmess.websocket(path, host, tlsSettings);
    else vmess.websocket(path, host);

    if (vmess.streamSetting && vmess.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'vmess',
        settings: vmess.setting,
        streamSettings: vmess.streamSetting,
      };
      this.save(outbound);
    }
  }

  public vmessGRPC(
    name: string,
    id: string,
    server: string,
    port: number,
    serviceName: string
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const vmess = new Vmess(id, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    vmess.grpc(serviceName, tlsSettings);

    if (vmess.streamSetting && vmess.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'vmess',
        settings: vmess.setting,
        streamSettings: vmess.streamSetting,
      };
      this.save(outbound);
    }
  }
}

class Vmess {
  protected _user: VmessUser | undefined;
  protected _server: VmessServer | undefined;
  protected _setting: VmessSetting | undefined;
  protected _streamSetting: StreamSetting | undefined;

  constructor(
    private id: string,
    private address: string,
    private port: number
  ) {
    this.user = { id, security: 'auto', level: 0 };
    this.server = { address, port, users: [this.user] };
    this.setting = { vnext: [this.server] };
  }

  public get streamSetting(): StreamSetting | undefined {
    return this._streamSetting;
  }

  private set streamSetting(streamSetting: StreamSetting) {
    this._streamSetting = streamSetting;
  }

  public get setting(): VmessSetting | undefined {
    return this._setting;
  }

  private set setting(vmessSetting: VmessSetting) {
    this._setting = vmessSetting;
  }

  private get server(): VmessServer | undefined {
    return this._server;
  }

  private set server(vmessServer: VmessServer) {
    this._server = vmessServer;
  }

  private get user(): VmessUser | undefined {
    return this._user;
  }

  private set user(vmessUser: VmessUser) {
    this._user = vmessUser;
  }

  public raw(tls?: TLSSetting) {
    let streamSetting: StreamSetting = {
      network: 'raw',
      rawSettings: { header: 'none' },
      security: 'none',
    };
    if (tls) streamSetting = this.tls(streamSetting, tls);
    this.streamSetting = streamSetting;
  }

  public websocket(path: string, host: string, tls?: TLSSetting) {
    let streamSetting: StreamSetting = {
      network: 'ws',
      wsSettings: { path, host },
      security: 'none',
    };
    if (tls) streamSetting = this.tls(streamSetting, tls);
    this.streamSetting = streamSetting;
  }

  public grpc(serviceName: string, tls: TLSSetting) {
    const streamSetting: StreamSetting = {
      network: 'grpc',
      security: 'none',
      grpcSettings: { serviceName },
    };
    this.streamSetting = this.tls(streamSetting, tls);
  }

  private tls(streamSettings: StreamSetting, tls: TLSSetting): StreamSetting {
    return {
      ...streamSettings,
      network: streamSettings.network,
      security: 'tls',
      tlsSettings: tls,
    };
  }

  private sockOpts(streamSetting: StreamSetting): StreamSetting {
    return {
      ...streamSetting,
      network: streamSetting.network,
      sockopt: {
        mark: 0,
        tcpFastOpen: true,
        tproxy: 'tproxy',
      },
    };
  }
}

function generateTLS(server: string): TLSSetting {
  return {
    allowInsecure: true,
    alpn: ['http/1.1'],
    serverName: server,
    fingerprint: 'chrome',
  };
}
