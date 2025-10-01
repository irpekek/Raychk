export interface IPInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  timezone: string;
  readme: string;
}
const isIPInfo = (obj: unknown): obj is IPInfo => {
  return obj !== null && typeof obj === 'object' && 'ip' in obj;
};

const URI = 'http://ipinfo.io/json';

export const infoIP = async (
  host: string,
  port: number,
): Promise<IPInfo | null> => {
  try {
    const client = Deno.createHttpClient({
      proxy: {
        url: `http://${host}:${port}`,
        transport: 'http',
      },
    });
    const response = await fetch(URI, { client });
    if (!response.ok) return null;
    const data = await response.json();
    if (!isIPInfo(data)) return null;
    return data;
  } catch (error: unknown) {
    if (Error.isError(error))
      throw new Error(`Failed to get ip info: ${error.message}`);
    throw new Error('Failed to get ip');
  }
};
