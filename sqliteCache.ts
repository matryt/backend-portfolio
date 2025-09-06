import { Database } from "bun:sqlite";

const db = new Database("cache.db");
db.run("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT)");

export function getCache(key: string): any | undefined {
  const row = db.query("SELECT value FROM cache WHERE key = ?").get(key) as { value?: string } | undefined;
  return row && row.value ? JSON.parse(row.value) : undefined;
}

export function setCache(key: string, value: any) {
  db.run("INSERT OR REPLACE INTO cache VALUES (?, ?)", [key, JSON.stringify(value)]);
}


export function resetCache() {
  db.run("DELETE FROM cache");
}

export function clearCache() {
  db.run("DELETE FROM cache");
}

export function resetCacheByType(type: "projects" | "education" | "jobs" | "all", lang?: string) {
  if (type === "all") {
    db.run("DELETE FROM cache");
    return;
  }
  if (lang) {
    db.run("DELETE FROM cache WHERE key = ?", [`${type}_${lang}`]);
  } else {
    db.run("DELETE FROM cache WHERE key LIKE ?", [`${type}_%`]);
  }
}
