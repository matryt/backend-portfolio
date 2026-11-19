import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { portfolioRoutes } from "./routes/portfolio";
import { cacheRoutes } from "./routes/cache";

const allowedOrigins = [
  "https://portfolio.mathieucuvelier.fr",
  "https://mathieucuvelier.fr",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const app = new Elysia()
  .use(
    cors({
      origin: (request) => {
        const origin = request.headers.get("origin");
        if (!origin) return true;
        return (
          allowedOrigins.includes(origin) ||
          origin.endsWith(".mathieucuvelier.fr")
        );
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    })
  )
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