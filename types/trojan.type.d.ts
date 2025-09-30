import { BaseServer } from "./outbound.type.d.ts";


export interface TrojanSetting {
  servers: TrojanServer[];
}

export interface TrojanServer extends BaseServer, TrojanUser { }

export interface TrojanUser {
  password: string;
  email?: string;
  level: number;
}
