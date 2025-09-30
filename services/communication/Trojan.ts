import { TrojanServer, TrojanSetting, TrojanUser } from "../../types/trojan.type.d.ts";

export class Trojan {
  protected _user!: TrojanUser;
  protected _server!: TrojanServer;
  protected _setting!: TrojanSetting;

  constructor(
    private readonly password: string,
    private readonly address: string,
    private readonly port: number
  ) {
    this._user = { password, level: 0 };
    this._server = { address, port, ...this._user };
    this._setting = { servers: [this._server] };
  }

  public get setting(): TrojanSetting {
    return this._setting;
  }

  private set setting(trojanSetting: TrojanSetting) {
    this._setting = trojanSetting;
  }

  public get server(): TrojanServer {
    return this._server;
  }

  private set server(trojanServer: TrojanServer) {
    this._server = trojanServer;
  }

  public get user(): TrojanUser {
    return this._user;
  }

  private set user(trojanUser: TrojanUser) {
    this._user = trojanUser;
  }
}
