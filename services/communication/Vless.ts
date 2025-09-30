import { VlessServer, VlessSetting, VlessUser } from '../../types/vless.type.d.ts';

export class Vless {
  protected _user!: VlessUser;
  protected _server!: VlessServer;
  protected _setting!: VlessSetting;

  constructor(
    private readonly id: string,
    private readonly address: string,
    private readonly port: number,
  ) {
    this._user = { id, encryption: 'none', level: 0, flow: '' };
    this._server = { address, port, users: [this._user] };
    this._setting = { vnext: [this._server] };
  }

  public get setting(): VlessSetting {
    return this._setting;
  }

  private set setting(vlessSetting: VlessSetting) {
    this._setting = vlessSetting;
  }

  public get server(): VlessServer {
    return this._server;
  }

  private set server(vlessServer: VlessServer) {
    this._server = vlessServer;
  }

  public get user(): VlessUser {
    return this._user;
  }

  private set user(vlessUser: VlessUser) {
    this._user = vlessUser;
  }
}
