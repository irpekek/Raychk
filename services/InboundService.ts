import {
  AllocateInbound,
  Inbound,
  protocol,
  SettingInbound,
  SniffingInbound,
} from '../types/inbound.type.d.ts';
import { StreamSetting } from '../types/transport.type.d.ts';

export class InboundService {
  protected _inbounds: Inbound[];

  constructor() {
    this._inbounds = [];
  }

  public get inbounds(): Inbound[] {
    return this._inbounds;
  }

  public clear() {
    this._inbounds.length = 0;
  }

  public add(inbound: Inbound) {
    this._inbounds.push(inbound);
  }

  private createInbound(
    listen: string,
    port: number,
    protocol: protocol,
    tag: string,
    settings?: object,
    streamSettings?: StreamSetting,
    sniffing?: SniffingInbound,
    allocate?: AllocateInbound,
  ): Inbound {
    return {
      listen,
      port,
      protocol,
      tag,
      settings: settings || {},
      streamSettings: streamSettings || ({} as StreamSetting),
      sniffing: sniffing || {
        enabled: true,
        destOverride: ['http', 'tls'],
      },
      allocate: allocate || {
        strategy: 'always',
        refresh: 5,
        concurrency: 3,
      },
    };
  }

  public http(
    listen: string,
    port: number,
    tag: string,
    settings?: SettingInbound,
    streamSettings?: StreamSetting,
    sniffing?: SniffingInbound,
    allocate?: AllocateInbound,
  ) {
    const inbound = this.createInbound(
      listen,
      port,
      'http',
      tag,
      settings,
      streamSettings,
      sniffing,
      allocate,
    );
    this.add(inbound);
  }

  public socks(
    listen: string,
    port: number,
    tag: string,
    settings?: SettingInbound,
    streamSettings?: StreamSetting,
    sniffing?: SniffingInbound,
    allocate?: AllocateInbound,
  ) {
    const inbound = this.createInbound(
      listen,
      port,
      'socks',
      tag,
      settings,
      streamSettings,
      sniffing,
      allocate,
    );
    this.add(inbound);
  }
}
