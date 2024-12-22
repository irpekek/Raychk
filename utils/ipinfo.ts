import { isError } from '../main.ts';

interface IPInfo {
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
  return obj !== null && typeof obj === 'object' && 'ip' in obj
}

const URI = 'http://ipinfo.io/json';

const getInfoIP = async (): Promise<IPInfo | null> => {
  try {
    const response = await fetch(URI);
    if (!response.ok) return null;
    const data = await response.json()
    if(!isIPInfo(data)) return null
    return data
  } catch (error) {
    if (isError(error))
      throw new Error(`Failed to get ip info: ${error.message}`);
    throw new Error("Failed to get ip")
  }
};