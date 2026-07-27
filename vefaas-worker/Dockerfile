FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY ical-core.js server.js update.js ./

ENV NODE_ENV=production
ENV PORT=3000
ENV CACHE_TTL_SECONDS=900
ENV CACHE_STALE_SECONDS=3600
ENV UPSTREAM_TIMEOUT_MS=10000

EXPOSE 3000

CMD ["node", "server.js"]
