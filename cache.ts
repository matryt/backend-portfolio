import NodeCache from "node-cache";

// Cache éternel (pas de TTL)
export const apiCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

export function resetApiCache() {
  apiCache.flushAll();
}
