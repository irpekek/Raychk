import { XrayService } from "../services/XrayService.ts";

export const CONFIG_DIR = './configs';
export const TEMP_DIR = './.tmp';
export const BINARY_FILE = await XrayService.location();
