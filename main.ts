import { spawn } from 'node:child_process';
import path from 'node:path';
import YAML from 'yaml';
import { XrayConfig } from './configs/config.ts';
import { Outbound } from './configs/outbound.ts';
import {
  isGRPC,
  isTLS,
  isTrojan,
  isVless,
  isVmess,
  isWebsocket,
  Proxy,
  Trojan,
  Vless,
  Vmess,
} from './types.ts';
import { getInfoIP, IPInfo } from './utils/ipinfo.ts';

export const isError = (obj: unknown): obj is Error => {
  return obj !== null && typeof obj === 'object' && obj instanceof Error;
};

const CONFIG_DIR = './configs';
const TEMP_DIR = './.tmp';
const BINARY_FILE = await xrayLocation();
const outbound = new Outbound();
const activeProxy = new Set();
const deadProxy = new Set();

async function xrayLocation(): Promise<string> {
  const cmd = new Deno.Command('which', { args: ['xray'] });
  const { code, stdout, stderr } = await cmd.output();
  const location = new TextDecoder().decode(stdout).trim();
  if (location.length === 0 || location === 'undefined') return 'not found';
  return location;
}

async function getXrayConfig(
  path: string,
  fileName: string
): Promise<XrayConfig> {
  const jsonVal = await Deno.readTextFile(`${path}/${fileName}`);
  return JSON.parse(jsonVal);
}

async function setXrayConfig(
  path: string,
  fileName: string,
  config: XrayConfig
): Promise<void> {
  await Deno.writeTextFile(`${path}/${fileName}`, JSON.stringify(config));
}

async function getProxy(path: string, fileName: string): Promise<Proxy[]> {
  const yamlVal = await Deno.readTextFile(`${path}/${fileName}`);
  const parsedYaml = YAML.parse(yamlVal);
  return parsedYaml.proxies;
}

// * This filter used to prevent same server value
function filterProxy<T extends Vmess | Vless | Trojan>(
  proxies: Set<T>
): Set<T> {
  const filteredProxy = new Set<T>();
  const usedServer = new Set<string>();
  const blockedIpPrefix = ['127', '192'];
  const blockedDomain = ['localhost'];
  for (const proxy of proxies) {
    if (!proxy.server) continue;
    const isBlockedIp = blockedIpPrefix.some((prefix) =>
      proxy.server.startsWith(prefix)
    );
    const isBlockedDomain = blockedDomain.includes(proxy.server);
    if (!usedServer.has(proxy.server) && !isBlockedDomain && !isBlockedIp) {
      usedServer.add(proxy.server);
      filteredProxy.add(proxy);
    }
  }
  return filteredProxy;
}

// * This reshape used to equalized value of server, servername, and host options
function reshapeProxy(proxies: Proxy[]): Set<Vmess | Vless | Trojan> {
  const reshapeProxy = new Set<Vmess | Vless | Trojan>();

  function addVWSTLS(proxy: Vmess | Vless): void {
    reshapeProxy.add({
      ...proxy,
      servername: proxy.server,
      'ws-opts': {
        path: proxy['ws-opts']?.path || '/',
        headers: { Host: proxy.server },
      },
    });

    reshapeProxy.add({
      ...proxy,
      name: `${proxy.name}_clone`,
      server: proxy.servername || proxy.server,
    });
  }
  function addVWSNTLS(proxy: Vmess | Vless): void {
    reshapeProxy.add({
      ...proxy,
      'ws-opts': {
        path: proxy['ws-opts']?.path || '/',
        headers: { Host: proxy.server },
      },
    });
    reshapeProxy.add({
      ...proxy,
      name: `${proxy.name}_clone`,
      server: proxy['ws-opts']?.headers?.Host || proxy.server,
    });
  }
  function addVGRPC(proxy: Vmess | Vless): void {
    reshapeProxy.add({ ...proxy, servername: proxy.server });
    reshapeProxy.add({
      ...proxy,
      name: `${proxy.name}_clone`,
      server: proxy.servername || proxy.server,
    });
  }
  function addTrojanWS(proxy: Trojan): void {
    reshapeProxy.add({
      ...proxy,
      sni: proxy.server,
      'ws-opts': {
        path: proxy['ws-opts']?.path || '/',
        headers: { Host: proxy.server },
      },
    });
    reshapeProxy.add({
      ...proxy,
      name: `${proxy.name}_clone`,
      server: proxy.sni,
    });
  }
  function addTrojanGRPC(proxy: Trojan): void {
    reshapeProxy.add({ ...proxy, sni: proxy.server });
    reshapeProxy.add({
      ...proxy,
      name: `${proxy.name}_clone`,
      server: proxy.sni,
    });
  }

  for (const proxy of proxies) {
    switch (true) {
      case isVmess(proxy):
        if (isWebsocket(proxy) && isTLS(proxy)) addVWSTLS(proxy);
        else if (isWebsocket(proxy) && !isTLS(proxy)) addVWSNTLS(proxy);
        else if (isGRPC(proxy)) addVGRPC(proxy);
        else continue;
        break;
      case isVless(proxy):
        if (isWebsocket(proxy) && isTLS(proxy)) addVWSTLS(proxy);
        else if (isWebsocket(proxy) && !isTLS(proxy)) addVWSNTLS(proxy);
        else if (isGRPC(proxy)) addVGRPC(proxy);
        else continue;
        break;
      case isTrojan(proxy):
        if (isWebsocket(proxy)) addTrojanWS(proxy);
        else if (isGRPC(proxy)) addTrojanGRPC(proxy);
        else continue;
        break;
      default:
        continue;
    }
  }
  return reshapeProxy;
}

function generateVmessConfig(config: Vmess) {
  // * VMESS WS TLS
  if (isWebsocket(config) && config['ws-opts'] && isTLS(config)) {
    outbound.vmessWebsocket(
      config.name,
      config.uuid,
      config.server,
      config.port,
      config['ws-opts'].path,
      config.server,
      true
    );
  } // * VMESS WS NON-TLS
  else if (isWebsocket(config) && config['ws-opts']) {
    outbound.vmessWebsocket(
      config.name,
      config.uuid,
      config.server,
      config.port,
      config['ws-opts'].path,
      config.server
    );
  }
  // * VMESS GRPC
  if (isGRPC(config) && config['grpc-opts']) {
    outbound.vmessGRPC(
      config.name,
      config.uuid,
      config.server,
      config.port,
      config['grpc-opts']['grpc-service-name']
    );
  }
}

function generateVlessConfig(config: Vless) {
  // * VLESS WS TLS
  if (isWebsocket(config) && config['ws-opts'] && isTLS(config)) {
    outbound.vlessWebsocket(
      config.name,
      config.uuid,
      config.server,
      config.port,
      config['ws-opts'].path,
      config.server,
      true
    );
  } // * VMESS WS NON-TLS
  else if (isWebsocket(config) && config['ws-opts']) {
    outbound.vlessWebsocket(
      config.name,
      config.uuid,
      config.server,
      config.port,
      config['ws-opts'].path,
      config.server
    );
  }
  // * VMESS GRPC
  if (isGRPC(config) && config['grpc-opts']) {
    outbound.vlessGRPC(
      config.name,
      config.uuid,
      config.server,
      config.port,
      config['grpc-opts']['grpc-service-name']
    );
  }
}

function generateTrojanConfig(config: Trojan) {
  // * Trojan WS
  if (isWebsocket(config) && config['ws-opts']) {
    outbound.trojanWebsocket(
      config.name,
      config.password,
      config.server,
      config.port,
      config['ws-opts'].path,
      config.server
    );
  } // * VMESS WS NON-TLS
  else if (config['ws-opts']) {
    outbound.trojanWebsocket(
      config.name,
      config.password,
      config.server,
      config.port,
      config['ws-opts'].path,
      config.server
    );
  }
  // * VMESS GRPC
  if (isGRPC(config) && config['grpc-opts']) {
    outbound.trojanGRPC(
      config.name,
      config.password,
      config.server,
      config.port,
      config['grpc-opts']['grpc-service-name']
    );
  }
}

function checkAliveProxy(): Promise<IPInfo | null> {
  return new Promise((resolve, _reject) => {
    const xray = spawn(BINARY_FILE, ['-c', `${TEMP_DIR}/config.json`]);
    xray.stdout.on('data', (data) => {
      const message = String(data);
      const splitMsg = message.split(' ');
      if (splitMsg.includes('Xray') && splitMsg.includes('started\n')) {
        setTimeout(async () => {
          Deno.env.set('HTTP_PROXY', 'http://127.0.0.1:1081');
          // * Set timeout 15s for every proxy check
          setTimeout(() => {
            xray.kill('SIGTERM');
            resolve(null);
          }, 15000);
          try {
            const ipInfo = await getInfoIP();
            Deno.env.delete('HTTP_PROXY');
            xray.kill('SIGTERM');
            if (ipInfo) resolve(ipInfo);
            else resolve(null);
          } catch (error) {
            console.error(error);
            resolve(null);
          }
        }, 2000);
      }
    });
    xray.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });
    xray.on('close', (_code) => {
      resolve(null);
    });
  });
}

async function main(filePath: string): Promise<void> {
  if (BINARY_FILE === 'not found') {
    console.error('Xray not found');
    console.error('Please install Xray first');
    return;
  }

  const parsedPath = path.parse(filePath);
  let proxies;
  try {
    proxies = await getProxy(parsedPath.dir, parsedPath.base);
  } catch (error) {
    if (isError(error)) console.error(error.message);
    return;
  }

  console.log('Reshape proxy...');
  const reshapedProxy = reshapeProxy(proxies);
  console.log('Filter proxy...');
  const filteredProxy = filterProxy(reshapedProxy);
  console.log('Check active proxy...');
  for (const proxy of filteredProxy) {
    console.log(`Started: ${proxy.server}`);
    const conf = { ...proxy };
    switch (true) {
      case isVmess(conf):
        generateVmessConfig(conf);
        break;
      case isVless(conf):
        generateVlessConfig(conf);
        break;
      case isTrojan(conf):
        generateTrojanConfig(conf);
        break;
      default:
        console.error('Config not supported');
        continue;
    }
    const defaultConf = await getXrayConfig(CONFIG_DIR, 'defaultConfig.json');
    const config: XrayConfig = { ...defaultConf, outbounds: outbound.all() };
    setXrayConfig(TEMP_DIR, 'config.json', config);
    const alive = await checkAliveProxy();
    if (alive) activeProxy.add(proxy);
    else deadProxy.add(proxy);
    outbound.clear();
    console.log(`End: ${proxy.server}`);
  }

  console.log(`Alive: ${activeProxy.size}`);
  console.log('Die: ', proxies.length - activeProxy.size);

  const ms = new Date().getMilliseconds();
  Deno.writeTextFileSync(
    `./activeProxy${ms}.yaml`,
    YAML.stringify({ proxies: Array.from(activeProxy) })
  );
  console.log(`Proxy saved at activeProxy${ms}.yaml`);
  return;
}

if (Deno.args[0])
  try {
    await main(Deno.args[0]);
  } catch (error) {
    console.error(error);
  }
