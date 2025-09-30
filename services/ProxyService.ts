import YAML from 'yaml';
import {
  hasProxies,
  isGRPC,
  isTLS,
  isTrojan,
  isVless,
  isVmess,
  isWebsocket,
} from '../types/guards.ts';
import {
  Proxy,
  TrojanProxy,
  VlessProxy,
  VmessProxy,
} from '../types/proxy.type.d.ts';
import { OutboundService } from './OutboundService.ts';
import { Transport } from '../types/transport.type.d.ts';
import { BINARY_FILE, CONFIG_DIR, TEMP_DIR } from '../const/const.ts';
import path from 'node:path';
import { XrayService as Xray } from './XrayService.ts';
import { XrayConfiguration } from '../types/xray.type.d.ts';
import { Outbound } from '../types/outbound.type.d.ts';
import { infoIP, IPInfo } from '../utils/ipinfo.ts';

class ProxyService {
  protected _proxies: Proxy[];
  protected _reshapedProxies: Set<VmessProxy | VlessProxy | TrojanProxy>;
  protected _filteredProxies: Set<VmessProxy | VlessProxy | TrojanProxy>;
  protected _blockedIpPrefix = ['127', '192'];
  protected _blockedDomain = ['localhost'];
  protected _liveProxies: Set<VmessProxy | VlessProxy | TrojanProxy>;
  protected readonly XRAY_START_TIMEOUT = 5000;
  protected readonly IP_FETCH_TIMEOUT = 15000;
  protected readonly POST_START_DELAY = 1000;

  constructor() {
    this._proxies = [];
    this._reshapedProxies = new Set();
    this._filteredProxies = new Set();
    this._liveProxies = new Set();
  }

  public get proxies(): Proxy[] {
    return this._proxies;
  }

  public get filteredProxies(): Set<VmessProxy | VlessProxy | TrojanProxy> {
    return this._filteredProxies;
  }

  public get liveProxies(): Set<VmessProxy | VlessProxy | TrojanProxy> {
    return this._liveProxies;
  }

  // * Get proxies from a file
  public async file(path: string, fileName: string) {
    try {
      const text = await Deno.readTextFile(`${path}/${fileName}`);
      const parsedObj = YAML.parse(text);
      if (hasProxies(parsedObj)) this._proxies = parsedObj.proxies;
      else throw new Error('proxies are not found');
    } catch (err: unknown) {
      console.error(err);
      Deno.exit(1);
    }
  }

  // * This reshape used to equalized value of server, servername, and host options
  private reshape() {
    const proxies = this._proxies;
    const vReshape = (
      proxy: VmessProxy | VlessProxy,
      tls: boolean,
      transport: Transport,
    ) => {
      // * Vmess WS TLS
      if (transport === 'ws' && tls) {
        this._reshapedProxies.add({
          ...proxy,
          servername: proxy.server,
          'ws-opts': {
            path: proxy['ws-opts']?.path || '/',
            headers: { Host: proxy.server },
          },
        });
        this._reshapedProxies.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.servername || proxy.server,
        });
      }
      // * Vmess WS Non-TLS
      if (transport === 'ws' && !tls) {
        this._reshapedProxies.add({
          ...proxy,
          'ws-opts': {
            path: proxy['ws-opts']?.path || '/',
            headers: { Host: proxy.server },
          },
        });
        this._reshapedProxies.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy['ws-opts']?.headers?.Host || proxy.server,
        });
      }
      // * Vmess GRPC TLS
      if (transport === 'grpc' && tls) {
        this._reshapedProxies.add({ ...proxy, servername: proxy.server });
        this._reshapedProxies.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.servername || proxy.server,
        });
      }
    };

    const tReshape = (
      proxy: TrojanProxy,
      tls: boolean,
      transport: Transport,
    ) => {
      // * Trojan WS TLS
      if (transport === 'ws' && tls) {
        this._reshapedProxies.add({
          ...proxy,
          sni: proxy.server,
          'ws-opts': {
            path: proxy['ws-opts']?.path || '/',
            headers: { Host: proxy.server },
          },
        });
        this._reshapedProxies.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.sni,
        });
      }
      // * Trojan GRPC TLS
      if (transport === 'grpc' && tls) {
        this._reshapedProxies.add({ ...proxy, sni: proxy.server });
        this._reshapedProxies.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.sni,
        });
      }
    };

    for (const proxy of proxies) {
      switch (true) {
        case isVmess(proxy):
          if (isWebsocket(proxy) && isTLS(proxy)) vReshape(proxy, true, 'ws');
          if (isWebsocket(proxy)) vReshape(proxy, false, 'ws');
          if (isGRPC(proxy)) vReshape(proxy, true, 'grpc');
          continue;
        case isVless(proxy):
          if (isWebsocket(proxy) && isTLS(proxy)) vReshape(proxy, true, 'ws');
          if (isWebsocket(proxy)) vReshape(proxy, false, 'ws');
          if (isGRPC(proxy)) vReshape(proxy, true, 'grpc');
          continue;
        case isTrojan(proxy):
          if (isWebsocket(proxy)) tReshape(proxy, true, 'ws');
          if (isGRPC(proxy)) tReshape(proxy, true, 'grpc');
          continue;
        default:
          continue;
      }
    }

    return this;
  }

  // * This filter used to prevent same server value
  private filter() {
    const usedServer = new Set<string>();
    const proxies = this._reshapedProxies;

    for (const proxy of proxies) {
      if (!proxy.server) continue;

      // check if the server is blocked by ip prefix
      const isBlockedIp = this._blockedIpPrefix.some((prefix) =>
        proxy.server.startsWith(prefix),
      );

      const isBlockedDomain = this._blockedDomain.includes(proxy.server); // check if the server is inluded in the blocked domain list

      if (!usedServer.has(proxy.server) && !isBlockedDomain && !isBlockedIp) {
        usedServer.add(proxy.server);
        this._filteredProxies.add(proxy);
      }
    }

    return this;
  }

  private generateConfig(
    proxy: VmessProxy | VlessProxy | TrojanProxy,
  ): Outbound[] {
    const outbound = new OutboundService();

    function vmess(
      proxy: VmessProxy,
      obs: OutboundService,
      tls: boolean,
      transport: Transport,
    ) {
      if (proxy['ws-opts']) {
        const { name, uuid, server, port } = proxy;
        const { path } = proxy['ws-opts'];
        obs.vmess(name, uuid, server, port, tls, transport, {
          path,
          host: server,
        });
      }
    }

    function vless(
      proxy: VlessProxy,
      obs: OutboundService,
      tls: boolean,
      transport: Transport,
    ) {
      if (proxy['ws-opts']) {
        const { name, uuid, server, port } = proxy;
        const { path } = proxy['ws-opts'];
        obs.vmess(name, uuid, server, port, tls, transport, {
          path,
          host: server,
        });
      }
    }

    function trojan(
      proxy: TrojanProxy,
      obs: OutboundService,
      tls: boolean,
      transport: Transport,
    ) {
      if (proxy['ws-opts']) {
        const { name, password, server, port } = proxy;
        const { path } = proxy['ws-opts'];
        obs.trojan(name, password, server, port, tls, transport, {
          path,
          host: server,
        });
      }
    }

    switch (true) {
      case isVmess(proxy):
        // Vmess Websocket
        if (isWebsocket(proxy) && isTLS(proxy))
          vmess(proxy, outbound, true, 'ws');
        if (isWebsocket(proxy) && !isTLS(proxy))
          vmess(proxy, outbound, false, 'ws');
        // Vmess GRPC
        if (isGRPC(proxy)) vmess(proxy, outbound, true, 'grpc');
        break;
      case isVless(proxy):
        // Vless Websocket
        if (isWebsocket(proxy) && isTLS(proxy))
          vless(proxy, outbound, true, 'ws');
        if (isWebsocket(proxy) && !isTLS(proxy))
          vless(proxy, outbound, false, 'ws');
        // vless GRPC
        if (isGRPC(proxy)) vless(proxy, outbound, true, 'grpc');
        break;
      case isTrojan(proxy):
        // Trojan Websocket
        if (isWebsocket(proxy) && isTLS(proxy))
          trojan(proxy, outbound, true, 'ws');
        if (isWebsocket(proxy) && !isTLS(proxy))
          trojan(proxy, outbound, false, 'ws');
        // Trojan GRPC
        if (isGRPC(proxy)) trojan(proxy, outbound, true, 'grpc');
        break;
    }

    return outbound.all();
  }

  private async checkProxy(): Promise<IPInfo | null> {
    const xray = Xray.spawn(`${TEMP_DIR}/config.json`);

    try {
      const isStarted = await Promise.race([
        Xray.findStringOut(xray, 'started', this.XRAY_START_TIMEOUT),
        new Promise<boolean>((_, reject) =>
          setTimeout(
            () => reject(new Error('Xray start timeout')),
            this.XRAY_START_TIMEOUT,
          ),
        ),
      ]);

      if (!isStarted) throw new Error('Xray failed to start');
      await new Promise((resolve) =>
        setTimeout(resolve, this.POST_START_DELAY),
      );

      const ipInfo = await Promise.race([
        infoIP('127.0.0.1', 1081),
        new Promise<IPInfo | null>((resolve) =>
          setTimeout(() => {
            resolve(null);
          }, this.IP_FETCH_TIMEOUT),
        ),
      ]);

      if (!ipInfo) throw new Error('Invalid or empty IP respons');
      return ipInfo;
    } catch (error: unknown) {
      if (Error.isError(error))
        console.error('Proxy check failed:', error.message);
      return null;
    } finally {
      if (xray && !xray.killed) xray.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for Xray to exit
    }
  }

  public async scan(filePath: string) {
    if (BINARY_FILE === 'not found')
      return console.error(
        'Xray binary file not found, please install xray first',
      );

    const srcConf = path.parse(filePath);
    await this.file(srcConf.dir, srcConf.base);
    this.reshape().filter();

    for (const proxy of this._filteredProxies) {
      console.log(`Started: ${proxy.server}`); // DELETE THIS

      let outbounds: Outbound[];
      switch (true) {
        case isVmess(proxy):
          outbounds = this.generateConfig(proxy);
          break;
        case isVless(proxy):
          outbounds = this.generateConfig(proxy);
          break;
        case isTrojan(proxy):
          outbounds = this.generateConfig(proxy);
          break;
        default:
          console.error('Config not supported');
          continue;
      }

      const defaultConfig = await Xray.getConfiguration(
        CONFIG_DIR,
        'defaultConfig.json',
      );
      const config: XrayConfiguration = {
        ...defaultConfig,
        outbounds,
      };
      await Xray.setConfiguration(TEMP_DIR, 'config.json', config);
      const live = await this.checkProxy();
      if (live) this._liveProxies.add(proxy);
      console.log(`End: ${proxy.server}`);
    }

    this.result();
  }

  public result() {
    console.log('Live Proxy: ', this._liveProxies.size);
    console.log('Dead Proxy: ', this._proxies.length - this._liveProxies.size);
    const dt = new Date().getMilliseconds();
    const name = `./Live Proxy ${dt}.yaml`;
    const content = YAML.stringify({
      proxies: Array.from(this._liveProxies),
    });
    Deno.writeTextFileSync(name, content);
    console.log(`Proxy saved at Live Proxy ${dt}.yaml`);
  }
}

export { ProxyService };
