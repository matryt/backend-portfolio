import { Elysia } from "elysia";
import { clearCache, resetCacheByType } from "../sqliteCache";

// Endpoints pour la gestion du cache
export const cacheRoutes = new Elysia({ prefix: '/cache' })

  .post("/clear-data", () => {
    clearCache();
    return { message: "Data cache (SQLite) cleared completely" };
  })

  .post("/clear-data/:type", ({ params, query }) => {
    const type = params.type as "projects" | "education" | "jobs" | "all";
    const lang = query.lang as 'fr' | 'en' | undefined;
    
    resetCacheByType(type, lang);
    
    const message = lang 
      ? `Data cache cleared for ${type} (${lang})`
      : `Data cache cleared for ${type} (all languages)`;
      
    return { message };
  });
