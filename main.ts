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
import { spawn } from 'node:child_process';
import { getInfoIP, IPInfo } from './utils/ipinfo.ts';
import YAML from 'yaml';
import path from 'node:path';

export const isError = (obj: unknown): obj is Error => {
  return obj !== null && typeof obj === 'object' && obj instanceof Error;
};

const CONFIG_DIR = './configs';
const TEMP_DIR = './.tmp';
const BINARY_FILE = '/usr/local/bin/xray';
const outbound = new Outbound();
const activeProxy = new Set();
const deadProxy = new Set();

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

function filterProxy(proxies: Proxy[]): Set<Vmess | Vless | Trojan> {
  const reshapeProxy = new Set<Vmess | Vless | Trojan>();
  const filteredProxy = new Set<Vmess | Vless | Trojan>();
  const usedServer = new Set<string>();
  // * This reshape used to equalized value of server, servername, and host options
  for (const proxy of proxies) {
    if (isVmess(proxy)) {
      // * VMESS WS TLS
      if (
        isWebsocket(proxy) &&
        proxy['ws-opts'] &&
        isTLS(proxy) &&
        proxy.servername
      ) {
        reshapeProxy.add({
          ...proxy,
          servername: proxy.server,
          'ws-opts': {
            path: proxy['ws-opts'].path,
            headers: { Host: proxy.server },
          },
        });

        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.servername,
        });
      }

      // * VMESS WS NON-TLS
      if (isWebsocket(proxy) && proxy['ws-opts'] && !isTLS(proxy)) {
        reshapeProxy.add({
          ...proxy,
          'ws-opts': {
            path: proxy['ws-opts'].path,
            headers: { Host: proxy.server },
          },
        });
        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy['ws-opts'].headers?.Host || proxy.server,
        });
      }
      // * VMESS GRPC
      if (isGRPC(proxy) && proxy.servername) {
        reshapeProxy.add({ ...proxy, servername: proxy.server });
        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.servername,
        });
      }
    }

    if (isVless(proxy)) {
      // * VLESS WS TLS
      if (
        isWebsocket(proxy) &&
        proxy['ws-opts'] &&
        isTLS(proxy) &&
        proxy.servername
      ) {
        reshapeProxy.add({
          ...proxy,
          servername: proxy.server,
          'ws-opts': {
            path: proxy['ws-opts'].path,
            headers: { Host: proxy.server },
          },
        });

        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.servername,
        });
      }

      // * VLESS WS NON-TLS
      if (isWebsocket(proxy) && proxy['ws-opts'] && !isTLS(proxy)) {
        reshapeProxy.add({
          ...proxy,
          'ws-opts': {
            path: proxy['ws-opts'].path,
            headers: { Host: proxy.server },
          },
        });
        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy['ws-opts'].headers.Host,
        });
      }

      if (isGRPC(proxy) && proxy.servername) {
        reshapeProxy.add({ ...proxy, servername: proxy.server });
        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.servername,
        });
      }
    }

    if (isTrojan(proxy)) {
      if (isWebsocket(proxy) && proxy['ws-opts']) {
        reshapeProxy.add({
          ...proxy,
          sni: proxy.server,
          'ws-opts': {
            path: proxy['ws-opts'].path,
            headers: { Host: proxy.server },
          },
        });
        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.sni,
        });
      }
      if (isGRPC(proxy)) {
        reshapeProxy.add({ ...proxy, sni: proxy.server });
        reshapeProxy.add({
          ...proxy,
          name: `${proxy.name}_clone`,
          server: proxy.sni,
        });
      }
    }
  }
  // * This filter used to prevent same server value
  for (const proxy of reshapeProxy) {
    if (!usedServer.has(proxy.server)) {
      usedServer.add(proxy.server);
      filteredProxy.add(proxy);
    }
  }
  return filteredProxy;
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
  return new Promise((resolve, reject) => {
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
            console.log('ERROR:' + error);
            reject(error);
          }
        }, 2000);
      }
    });
    xray.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });
  });
}

async function main(filePath: string): Promise<void> {
  const parsedPath = path.parse(filePath);
  let proxies
  try {
    proxies = await getProxy(parsedPath.dir, parsedPath.base);
  } catch (error) {
    if(isError(error)) console.error(error.message)
    return
  }
  const filteredProxy = filterProxy(proxies);

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
        console.error('config not supported');
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
  console.log(`Die: ${deadProxy.size}`);

  const ms = new Date().getMilliseconds();
  Deno.writeTextFileSync(
    `./hasil${ms}.yaml`,
    YAML.stringify({ proxies: Array.from(activeProxy) })
  );
}

if (Deno.args[0]) await main(Deno.args[0]);
