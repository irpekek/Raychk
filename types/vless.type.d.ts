import { BaseServer } from "./outbound.type.d.ts";
import { VmessUser } from "./vmess.type.d.ts";


type VlessEncryption = 'none';

export interface VlessSetting {
  vnext: VlessServer[];
}

export interface VlessServer extends BaseServer {
  users: VlessUser[];
}

export interface VlessUser extends Omit<VmessUser, 'security'> {
  encryption: VlessEncryption;
  flow: string;
}
