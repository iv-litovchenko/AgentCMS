# Agent CMS — CMS + MCP + Control (без Electron)
FROM node:22-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    ffmpeg \
    git \
    jq \
    lsof \
    make \
    g++ \
    openssh-client \
    pkg-config \
    python3 \
    python3-pip \
    python3-venv \
    rsync \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY mcp-server/package.json mcp-server/package-lock.json ./mcp-server/
COPY scripts ./scripts
RUN mkdir -p public public/_resources/vendor public/_resources/vendor/fancybox public/shell/vendor/loaders public/shell/vendor/utils

RUN npm ci --ignore-scripts \
  && cd mcp-server && npm ci --ignore-scripts && cd ..

COPY . .

RUN npm run postinstall \
  && npm prune --omit=dev \
  && cd mcp-server && npm prune --omit=dev && cd ..

# Docker CLI + Compose plugin (Control: start/stop CMS через compose + socket)
RUN set -eux; \
  ARCH="$(dpkg --print-architecture)"; \
  case "$ARCH" in \
    amd64) DARCH="x86_64"; COMPOSE_ARCH="x86_64" ;; \
    arm64) DARCH="aarch64"; COMPOSE_ARCH="aarch64" ;; \
    *) echo "unsupported arch: $ARCH"; exit 1 ;; \
  esac; \
  curl -fsSL "https://download.docker.com/linux/static/stable/${DARCH}/docker-27.3.1.tgz" \
    | tar xzv -C /usr/local/bin --strip-components=1 docker/docker; \
  mkdir -p /usr/local/lib/docker/cli-plugins; \
  curl -fsSL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${COMPOSE_ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose; \
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV VOICE_HOST=0.0.0.0
ENV CONTROL_HOST=0.0.0.0
ENV AGENT_CMS_HTTP_TO_HTTPS=0
ENV CONTROL_AUTOSTART=0
ENV VOICE_AUTOSTART=1

EXPOSE 3000 3088 3288 3490

RUN chmod +x /app/scripts/docker-entrypoint.sh

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["cms"]
