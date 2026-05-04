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

RUN mkdir -p /app/storage-seed && \
    if [ -d /app/src/Utilities/Storage ]; then \
      cp -a /app/src/Utilities/Storage/. /app/storage-seed/; \
    fi

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "."]