FROM oven/bun:1.4.4-alpine

WORKDIR /app

ENV NODE_ENV=production

# Mise en cache des dépendances Bun
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

# Copie du code source
COPY . .

EXPOSE 21000

CMD ["bun", "run", "index.ts"]