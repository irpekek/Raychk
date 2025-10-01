import { Outbound, Protocol } from '../types/outbound.type.d.ts';
import { Transport } from '../types/transport.type.d.ts';
import { Trojan } from './communication/Trojan.ts';
import { Vless } from './communication/Vless.ts';
import { Vmess } from './communication/Vmess.ts';
import { TransportService } from './TransportService.ts';

type AdditionalData = {
  path?: string;
  host?: string;
  serviceName?: string;
};

type CommunicationService = Vmess | Vless | Trojan;

export class OutboundService {
  protected _outbounds: Outbound[];

  constructor() {
    this._outbounds = [];
  }

  public get outbounds(): Outbound[] {
    return this._outbounds;
  }

  public clear(): void {
    this._outbounds.length = 0;
  }

  public add(outbound: Outbound): void {
    this._outbounds.push(outbound);
  }

  private createOutbound(
    tag: string,
    communicationProtocol: CommunicationService,
    transportProtocol: TransportService,
  ): Outbound {
    let protocol: Protocol;
    if (communicationProtocol instanceof Vmess) protocol = 'vmess';
    else if (communicationProtocol instanceof Vless) protocol = 'vless';
    else protocol = 'trojan';

    return {
      tag: tag,
      protocol: protocol,
      settings: communicationProtocol.setting,
      streamSettings: transportProtocol.streamSetting,
    };
  }

  private hasTag(name: string): boolean {
    const outbounds = this._outbounds;
    const tag = outbounds.find((outbound) => outbound.tag === name);
    return tag ? true : false;
  }

  private transportSelection(
    transport: Transport,
    tls: boolean,
    server: string,
    additionalData?: AdditionalData,
  ): TransportService {
    const transportProtocol = new TransportService();
    switch (transport) {
      case 'raw':
        if (tls) transportProtocol.raw().tls(server);
        else transportProtocol.raw();
        break;
      case 'ws':
        if (tls)
          transportProtocol
            .websocket(additionalData?.path || '/', additionalData?.host || '')
            .tls(server);
        else
          transportProtocol.websocket(
            additionalData?.path || '/',
            additionalData?.host || '',
          );
        break;
      case 'grpc':
        if (tls)
          transportProtocol.grpc(additionalData?.serviceName || '').tls(server);
        else transportProtocol.grpc(additionalData?.serviceName || '');
        break;
    }
    return transportProtocol;
  }

  public vmess(
    name: string,
    id: string,
    server: string,
    port: number,
    tls: boolean,
    transport: Transport,
    additionalData?: AdditionalData,
  ) {
    if (this.hasTag(name)) throw new Error(`${name} tag is already taken`);
    const communicationProtocol = new Vmess(id, server, port);
    const transportProtocol = this.transportSelection(
      transport,
      tls,
      server,
      additionalData,
    );
    const outbound = this.createOutbound(
      name,
      communicationProtocol,
      transportProtocol,
    );
    this.add(outbound);
  }

  public vless(
    name: string,
    id: string,
    server: string,
    port: number,
    tls: boolean,
    transport: Transport,
    additionalData?: AdditionalData,
  ) {
    if (this.hasTag(name)) throw new Error(`${name} tag is already taken`);
    const communicationProtocol = new Vless(id, server, port);
    const transportProtocol = this.transportSelection(
      transport,
      tls,
      server,
      additionalData,
    );
    const outbound = this.createOutbound(
      name,
      communicationProtocol,
      transportProtocol,
    );
    this.add(outbound);
  }

  public trojan(
    name: string,
    password: string,
    server: string,
    port: number,
    tls: boolean,
    transport: Transport,
    additionalData?: AdditionalData,
  ) {
    if (this.hasTag(name)) return console.error(`${name} tag is already taken`);
    const communicationProtocol = new Trojan(password, server, port);
    const transportProtocol = this.transportSelection(
      transport,
      tls,
      server,
      additionalData,
    );
    const outbound = this.createOutbound(
      name,
      communicationProtocol,
      transportProtocol,
    );
    this.add(outbound);
  }
}
