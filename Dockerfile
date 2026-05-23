FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    bash \
    rsync \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN if [ -d .git ]; then \
      git rev-parse HEAD > /app/.build-commit-full && \
      git rev-parse --short HEAD > /app/.build-commit-short; \
    else \
      printf '' > /app/.build-commit-full && \
      printf '' > /app/.build-commit-short; \
    fi

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "."]
