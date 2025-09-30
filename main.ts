import { ProxyService } from "./services/ProxyService.ts";

function main(filePath: string): Promise<void> {
  return new ProxyService().scan(filePath);
}

if (Deno.args[0])
  try {
    await main(Deno.args[0]);
  } catch (error) {
    console.error(error);
  }
