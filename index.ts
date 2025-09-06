import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { portfolioRoutes } from "./routes/portfolio";
import { cacheRoutes } from "./routes/cache";

const app = new Elysia()
  .use(cors())
  .use(portfolioRoutes)
  .use(cacheRoutes);

app.listen(21000);