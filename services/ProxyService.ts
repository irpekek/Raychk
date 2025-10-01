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
import { InboundService } from './InboundService.ts';
import { RoutingService } from './RoutingService.ts';
import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { validate } from '@std/uuid';

class ProxyService {
  protected _proxies: Proxy[];
  protected _reshapedProxies: Set<VmessProxy | VlessProxy | TrojanProxy>;
  protected _filteredProxies: Set<VmessProxy | VlessProxy | TrojanProxy>;
  protected _blockedIpPrefix = ['127', '192'];
  protected _blockedDomain = ['localhost'];
  protected _liveProxies: Set<VmessProxy | VlessProxy | TrojanProxy>;
  protected readonly XRAY_START_TIMEOUT = 5000;
  protected readonly IP_FETCH_TIMEOUT = 5000;
  protected readonly POST_START_DELAY = 1000;
  protected readonly HTTP_LISTEN = '127.0.0.1';

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
      const parsedObj = YAML.parse(text, { merge: true });
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
      if (!isTrojan(proxy) && !validate(proxy.uuid)) continue; // check if the uuid is valid for vmess and vless

      // Check if port is valid for proxy which is a number
      if (typeof proxy.port === 'string') {
        const p = parseInt(proxy.port);
        if (isNaN(p)) continue;
        proxy.port = p;
      }

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

  private async throttle(
    m: Array<() => Promise<void>>,
    concurrency: number = 20,
    timeout: number = 1000,
  ) {
    for (let i = 0; i < m.length; i += concurrency) {
      console.log(`${i + 1} ~ ${Math.min(i + concurrency, m.length)}`);
      const batch = m.slice(i, i + concurrency);
      await Promise.all(batch.map((fn) => fn()));
      await new Promise((resolve) => setTimeout(resolve, timeout));
    }
  }

  private async checkProxy(
    xray: ChildProcessWithoutNullStreams,
    fp: (VmessProxy | VlessProxy | TrojanProxy)[],
  ) {
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

      // Create pending promises for each proxy
      const promisesProxy = fp.map((proxy, index) => async () => {
        const port = 1081 + index;
        try {
          const info = await Promise.race([
            infoIP(this.HTTP_LISTEN, port),
            new Promise<IPInfo | null>((resolve) =>
              setTimeout(() => resolve(null), this.IP_FETCH_TIMEOUT),
            ),
          ]);
          if (info) this._liveProxies.add(proxy);
        } catch (error: unknown) {
          if (Error.isError(error))
            console.error(
              `Check failed for ${proxy.server} (port: ${port}): ${error.message}`,
            );
          else
            console.error(
              `Unexpected error for ${proxy.server} (port: ${port}): ${error}`,
            );
        }
      });

      await this.throttle(promisesProxy, 20); // Throttle the check to prevent Xray from being overwhelmed

      // Kill Xray after all check
      if (xray && !xray.killed) xray.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: unknown) {
      console.error('Scan failed:', error);
    } finally {
      // Ensure Xray is killed even on error
      if (xray && !xray.killed) xray.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  public async scan(filePath: string) {
    if (BINARY_FILE === 'not found')
      return console.error(
        'Xray binary file not found, please install xray first',
      );

    const srcConf = path.parse(filePath);
    await this.file(srcConf.dir, srcConf.base);
    const timeStart = Date.now();
    this.reshape().filter();

    const outboundService = new OutboundService();
    const inboundService = new InboundService();
    const routingService = new RoutingService();

    let portCounter = 1081;
    const fp = Array.from(this._filteredProxies);
    for (const [index, proxy] of fp.entries()) {
      const outboundNameTag = 'Proxy ' + (index + 1);
      const inboundNameTag = 'Http ' + (index + 1);
      let outbounds: Outbound[];

      // Create outbounds from all filtered proxies and save them to outboundService
      switch (true) {
        case isVmess(proxy):
          outbounds = this.generateConfig({ ...proxy, name: outboundNameTag });
          if (outbounds.length > 0) outboundService.save(outbounds[0]);
          break;
        case isVless(proxy):
          outbounds = this.generateConfig({ ...proxy, name: outboundNameTag });
          if (outbounds.length > 0) outboundService.save(outbounds[0]);
          break;
        case isTrojan(proxy):
          outbounds = this.generateConfig({ ...proxy, name: outboundNameTag });
          if (outbounds.length > 0) outboundService.save(outbounds[0]);
          break;
        default:
          console.error('Config not supported');
          continue;
      }

      // Create inbounds http protocol for each proxy with a unique port
      inboundService.http(this.HTTP_LISTEN, portCounter, inboundNameTag);

      // Create routing rules for each proxy
      routingService.addRule(
        'hybrid',
        'field',
        [inboundNameTag],
        outboundNameTag,
      );

      portCounter++;
    }

    try {
      const defaultConfig = await Xray.getConfiguration(
        CONFIG_DIR,
        'defaultConfig.json',
      );

      const config: XrayConfiguration = {
        ...defaultConfig,
        inbounds: inboundService.inbounds,
        outbounds: outboundService.all(),
        routing: routingService.routing,
      };

      await Xray.setConfiguration(TEMP_DIR, 'config.json', config);
      const xray = Xray.spawn(`${TEMP_DIR}/config.json`);
      console.log(`Checking proxies...`);
      await this.checkProxy(xray, fp);
    } catch (error: unknown) {
      if (Error.isError(error)) console.error(`Scan failed: ${error.message}`);
      else console.error(`Unknown error, Scan failed: ${error}`);
    }
    console.log(
      `Scan finished in ${((Date.now() - timeStart) / 1000).toFixed(2)} seconds`,
    );
    this.result();
  }

  public result() {
    console.log('Total Proxy:', this._proxies.length);
    console.log('Live:', this._liveProxies.size);
    console.log('Die :', this._proxies.length - this._liveProxies.size);
    const dt = new Date().getMilliseconds();
    const name = `./Live_Proxy_${dt}.yaml`;
    const content = YAML.stringify({
      proxies: Array.from(this._liveProxies),
    });
    Deno.writeTextFileSync(name, content);
    console.log(`Saved File: Live_Proxy_${dt}.yaml`);
  }
}

export { ProxyService };
