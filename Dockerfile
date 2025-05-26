# --- base: install all dependencies and build shared lib ---
FROM node:20 as base

RUN npm install -g pnpm

WORKDIR /repo

# Copy only package manifests first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/connector/package.json apps/connector/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/types/package.json packages/types/package.json

# Install only relevant deps (shared + apps) inside Docker
RUN pnpm install

# Copy full source code
COPY . .

# Optional: build shared if needed
RUN cd packages/types && pnpm run build && cd /repo



# --- backend build ---
FROM base as backend-builder
RUN pnpm run build:backend

# --- connector build ---
FROM base as connector-builder
RUN pnpm run build:connector

# --- frontend build ---
FROM base as frontend-builder
RUN pnpm run build:frontend

# --- backend final image ---
FROM node:20-slim as backend
WORKDIR /app

COPY --from=backend-builder /repo/packages/types/dist ./packages/types/
COPY --from=backend-builder /repo/node_modules ./node_modules
COPY --from=backend-builder /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=backend-builder /repo/apps/backend/dist ./apps/backend/dist

CMD ["node", "apps/backend/dist/main.js"]

# --- connector final image ---
FROM node:20-slim as connector
WORKDIR /app

COPY --from=connector-builder /repo/packages/types/dist ./packages/types/
COPY --from=connector-builder /repo/node_modules ./node_modules
COPY --from=connector-builder /repo/apps/connector/node_modules ./apps/connector/node_modules
COPY --from=connector-builder /repo/apps/connector/dist ./apps/connector/dist
#CMD ["node", "apps/connector/dist/index.js"]
RUN apt-get update && \
    apt-get install -y socat && \
    rm -rf /var/lib/apt/lists/*

COPY --from=connector-builder /repo/connector_entrypoint.sh ./connector_entrypoint.sh
RUN chmod +x ./connector_entrypoint.sh

ENTRYPOINT ["./connector_entrypoint.sh"]

# --- frontend final image ---
FROM nginx:alpine as frontend
COPY --from=frontend-builder /repo/packages/types/dist ./packages/types/
COPY --from=frontend-builder /repo/apps/frontend/www /usr/share/nginx/html
COPY --from=frontend-builder /repo/apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
