export function setProxyEnv(proxy?: string) {
  if (!proxy) Deno.env.delete('HTTP_PROXY');
  else Deno.env.set('HTTP_PROXY', proxy);
}
