import {
  Fingerprint,
  StreamSetting,
  TLSSetting,
  TProxy,
} from '../types/transport.type.d.ts';

export class TransportService {
  protected _streamSetting!: StreamSetting;

  public get streamSetting(): StreamSetting {
    return this._streamSetting;
  }

  private set streamSetting(streamSetting: StreamSetting) {
    this._streamSetting = streamSetting;
  }

  public raw() {
    this.streamSetting = {
      ...this.streamSetting,
      network: 'raw',
      rawSettings: { header: 'none' },
      security: 'none',
    };
    return this;
  }

  public websocket(path: string, host: string) {
    this.streamSetting = {
      ...this.streamSetting,
      network: 'ws',
      wsSettings: { path, host },
      security: 'none',
    };
    return this;
  }

  public grpc(serviceName: string) {
    this.streamSetting = {
      ...this.streamSetting,
      network: 'grpc',
      grpcSettings: { serviceName },
      security: 'none',
    };
    return this;
  }

  public tls(sni: string) {
    this.streamSetting = {
      ...this.streamSetting,
      tlsSettings: this.generateTLS(sni),
      security: 'tls',
    };
    return this;
  }

  public sockOpts(
    tcpFastOpen: boolean = true,
    mark: number = 0,
    tproxy: TProxy = 'tproxy',
  ) {
    this.streamSetting = {
      ...this.streamSetting,
      sockopt: {
        mark,
        tcpFastOpen,
        tproxy,
      },
    };
    return this;
  }

  private generateTLS(
    server: string,
    fingerprint: Fingerprint = 'random',
  ): TLSSetting {
    return {
      allowInsecure: true,
      alpn: ['http/1.1'],
      serverName: server,
      fingerprint: fingerprint,
    };
  }
}
