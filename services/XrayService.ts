import { spawn } from 'node:child_process';
import { XrayConfiguration } from '../types/xray.type.d.ts';
import { BINARY_FILE } from '../const/const.ts';
import { ChildProcessWithoutNullStreams } from 'node:child_process';
import { Buffer } from 'node:buffer';

export class XrayService {
  static async location(): Promise<string> {
    const cmd = new Deno.Command('which', { args: ['xray'] });
    const { stdout } = await cmd.output();
    const location = new TextDecoder().decode(stdout).trim();
    if (location.length === 0 || location === 'undefined') return 'not found';
    return location;
  }

  static async getConfiguration(
    path: string,
    fileName: string,
  ): Promise<XrayConfiguration> {
    const jsonVal = await Deno.readTextFile(`${path}/${fileName}`);
    return JSON.parse(jsonVal);
  }

  static async setConfiguration(
    path: string,
    fileName: string,
    config: XrayConfiguration,
  ): Promise<void> {
    await Deno.writeTextFile(`${path}/${fileName}`, JSON.stringify(config));
  }

  static spawn(configLocation: string): ChildProcessWithoutNullStreams {
    return spawn(BINARY_FILE, ['-c', configLocation]);
  }

  static findStringOut(
    proc: ChildProcessWithoutNullStreams,
    str: string,
    timeoutMs: number = 10000,
  ): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      const onData = (data: Buffer) => {
        const message = data.toString();
        const splitMsg = message.split(/\s+/); // split on whitespace

        if (splitMsg.includes(str)) {
          proc.stdout.off('data', listener);
          clearTimeout(timeoutId);
          resolve(true);
        }
      };
      const listener = onData;
      proc.stdout.on('data', listener);

      // Timeout if not found
      const timeoutId = setTimeout(() => {
        proc.stdout.off('data', listener);
        resolve(false);
      }, timeoutMs);

      // Clean up if process closes early
      const onClose = () => {
        clearTimeout(timeoutId);
        proc.stdout.off('data', listener);
        resolve(false);
      };

      proc.on('close', onClose);
      proc.on('error', onClose);
    });
  }
}
