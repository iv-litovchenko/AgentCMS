# Agent CMS — server/runtime (без Electron)
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY mcp-server/package.json mcp-server/package-lock.json ./mcp-server/
COPY scripts ./scripts
RUN mkdir -p public public/_resources/vendor public/_resources/vendor/fancybox public/shell/vendor/loaders public/shell/vendor/utils

# postinstall тянет three/material-icon-theme (devDeps) — ставим всё, потом prune
RUN npm ci --ignore-scripts \
  && cd mcp-server && npm ci --ignore-scripts && cd ..

COPY . .

RUN npm run postinstall \
  && npm prune --omit=dev \
  && cd mcp-server && npm prune --omit=dev && cd ..

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV VOICE_HOST=0.0.0.0
ENV AGENT_CMS_HTTP_TO_HTTPS=0
ENV VOICE_AUTOSTART=1

EXPOSE 3000 3088 3490

RUN chmod +x /app/scripts/docker-entrypoint.sh

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["cms"]
