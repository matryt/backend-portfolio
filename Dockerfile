FROM oven/bun:1.4.2-alpine

WORKDIR /app

ENV NODE_ENV=production

# Mise en cache des dépendances Bun
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

# Copie du code source
COPY . .

# Elysia écoute généralement sur le port 3000 par défaut
EXPOSE 3000

# Commande d'exécution Bun (adapte si ton point d'entrée est src/index.ts)
CMD ["bun", "run", "index.ts"]