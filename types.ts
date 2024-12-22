interface Proxy {
  name: string;
  server: string;
  port: number;
  type: string;
  network: string;
  'skip-cert-verify': boolean;
  udp: boolean;
  'ws-opts'?: WebsocketOpts;
}
interface WebsocketOpts {
  path: string;
  headers: WebsocketHeaders;
  host?: string
}
interface WebsocketHeaders {
  host: string;
}
interface Trojan extends Proxy {
  sni: string;
  password: string;
}
interface Vmess extends Proxy {
  tls: boolean;
  uuid: string;
  alterid: number;
  cipher: string;
  servername: string;
}
interface Vless extends Proxy {
  tls: boolean;
  uuid: string;
  alterid: number;
  cipher: string;
  servername: string;
}
