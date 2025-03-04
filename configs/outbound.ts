import {
  XrayOutbound,
  TLSSetting,
  VmessUser,
  VmessServer,
  VmessSetting,
  StreamSetting,
  VlessUser,
  VlessServer,
  VlessSetting,
  TrojanUser,
  TrojanServer,
  TrojanSetting,
} from './outbound.types.ts';

export class Outbound {
  protected _outbound: XrayOutbound[] = [];

  public all(): XrayOutbound[] {
    return this._outbound;
  }

  public clear(): void {
    this._outbound.length = 0;
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

  public vless(
    name: string,
    id: string,
    server: string,
    port: number,
    tls = false
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const vless = new Vless(id, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    if (tls) vless.raw(tlsSettings);
    else vless.raw();

    if (vless.streamSetting && vless.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'vless',
        settings: vless.setting,
        streamSettings: vless.streamSetting,
      };
      this.save(outbound);
    }
  }

  public vlessWebsocket(
    name: string,
    id: string,
    server: string,
    port: number,
    path: string,
    host: string,
    tls = false
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const vless = new Vless(id, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    if (tls) vless.websocket(path, host, tlsSettings);
    else vless.websocket(path, host);

    if (vless.streamSetting && vless.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'vless',
        settings: vless.setting,
        streamSettings: vless.streamSetting,
      };
      this.save(outbound);
    }
  }

  public vlessGRPC(
    name: string,
    id: string,
    server: string,
    port: number,
    serviceName: string
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const vless = new Vless(id, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    vless.grpc(serviceName, tlsSettings);

    if (vless.streamSetting && vless.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'vless',
        settings: vless.setting,
        streamSettings: vless.streamSetting,
      };
      this.save(outbound);
    }
  }

  public trojan(name: string, password: string, server: string, port: number) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const trojan = new Trojan(password, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    trojan.raw(tlsSettings);

    if (trojan.streamSetting && trojan.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'trojan',
        settings: trojan.setting,
        streamSettings: trojan.streamSetting,
      };
      this.save(outbound);
    }
  }

  public trojanWebsocket(
    name: string,
    password: string,
    server: string,
    port: number,
    path: string,
    host: string
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const trojan = new Trojan(password, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    trojan.websocket(path, host, tlsSettings);

    if (trojan.streamSetting && trojan.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'trojan',
        settings: trojan.setting,
        streamSettings: trojan.streamSetting,
      };
      this.save(outbound);
    }
  }

  public trojanGRPC(
    name: string,
    password: string,
    server: string,
    port: number,
    serviceName: string
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const trojan = new Trojan(password, server, port);
    const tlsSettings: TLSSetting = generateTLS(server);
    trojan.grpc(serviceName, tlsSettings);

    if (trojan.streamSetting && trojan.setting) {
      const outbound: XrayOutbound = {
        tag: name,
        protocol: 'trojan',
        settings: trojan.setting,
        streamSettings: trojan.streamSetting,
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

class Vless {
  protected _user: VlessUser | undefined;
  protected _server: VlessServer | undefined;
  protected _setting: VlessSetting | undefined;
  protected _streamSetting: StreamSetting | undefined;

  constructor(
    private id: string,
    private address: string,
    private port: number
  ) {
    this.user = { id, encryption: 'none', level: 0, flow: '' };
    this.server = { address, port, users: [this.user] };
    this.setting = { vnext: [this.server] };
  }

  public get streamSetting(): StreamSetting | undefined {
    return this._streamSetting;
  }

  private set streamSetting(streamSetting: StreamSetting) {
    this._streamSetting = streamSetting;
  }

  public get setting(): VlessSetting | undefined {
    return this._setting;
  }

  private set setting(vlessSetting: VlessSetting) {
    this._setting = vlessSetting;
  }

  private get server(): VlessServer | undefined {
    return this._server;
  }

  private set server(vlessServer: VlessServer) {
    this._server = vlessServer;
  }

  private get user(): VlessUser | undefined {
    return this._user;
  }

  private set user(vlessUser: VlessUser) {
    this._user = vlessUser;
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

class Trojan {
  protected _user: TrojanUser | undefined;
  protected _server: TrojanServer | undefined;
  protected _setting: TrojanSetting | undefined;
  protected _streamSetting: StreamSetting | undefined;

  constructor(
    private password: string,
    private address: string,
    private port: number
  ) {
    this.user = { password, level: 0 };
    this.server = { address, port, ...this.user };
    this.setting = { servers: [this.server] };
  }

  public get streamSetting(): StreamSetting | undefined {
    return this._streamSetting;
  }

  private set streamSetting(streamSetting: StreamSetting) {
    this._streamSetting = streamSetting;
  }

  public get setting(): TrojanSetting | undefined {
    return this._setting;
  }

  private set setting(trojanSetting: TrojanSetting) {
    this._setting = trojanSetting;
  }

  private get server(): TrojanServer | undefined {
    return this._server;
  }

  private set server(trojanServer: TrojanServer) {
    this._server = trojanServer;
  }

  private get user(): TrojanUser | undefined {
    return this._user;
  }

  private set user(trojanUser: TrojanUser) {
    this._user = trojanUser;
  }

  public raw(tls: TLSSetting) {
    const streamSetting: StreamSetting = {
      network: 'raw',
      rawSettings: { header: 'none' },
      security: 'none',
    };
    this.streamSetting = this.tls(streamSetting, tls);
  }

  public websocket(path: string, host: string, tls: TLSSetting) {
    const streamSetting: StreamSetting = {
      network: 'ws',
      wsSettings: { path, host },
      security: 'none',
    };
    this.streamSetting = this.tls(streamSetting, tls);
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
}

function generateTLS(server: string): TLSSetting {
  return {
    allowInsecure: true,
    alpn: ['http/1.1'],
    serverName: server,
    fingerprint: 'chrome',
  };
}
