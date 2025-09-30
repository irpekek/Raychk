import { VmessServer, VmessSetting, VmessUser } from '../../types/vmess.type.d.ts';

export class Vmess {
  protected _user!: VmessUser
  protected _server!: VmessServer
  protected _setting!: VmessSetting

  constructor(
    private readonly id: string,
    private readonly address: string,
    private readonly port: number,
  ) {
    this._user = { id, security: 'auto', level: 0 };
    this._server = { address, port, users: [this._user] };
    this._setting = { vnext: [this._server] };
  }

  public get setting(): VmessSetting {
    return this._setting;
  }

  private set setting(vmessSetting: VmessSetting) {
    this._setting = vmessSetting;
  }

  public get server(): VmessServer {
    return this._server;
  }

  private set server(vmessServer: VmessServer) {
    this._server = vmessServer;
  }

  public get user(): VmessUser {
    return this._user;
  }

  private set user(vmessUser: VmessUser) {
    this._user = vmessUser;
  }
}
