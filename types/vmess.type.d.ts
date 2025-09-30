import { BaseServer } from './outbound.type.d.ts';

type VmessSecurity = 'auto' | 'none' | 'zero';

export interface VmessSetting {
  vnext: VmessServer[];
}

export interface VmessServer extends BaseServer {
  users: VmessUser[];
}

export interface VmessUser {
  id: string;
  security: VmessSecurity;
  level: number;
}
