import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { portfolioRoutes } from "./routes/portfolio";
import { cacheRoutes } from "./routes/cache";

const app = new Elysia()
  .use(cors())
  .use(portfolioRoutes)
  .use(cacheRoutes);

const port = Number(process.env.PORT) || 21000;

app.listen(
  {
    port,
    hostname: "0.0.0.0",
  },
  ({ hostname, port }) => {
    console.log(`🦊 Elysia tourne sur http://${hostname}:${port}`);
  }
);