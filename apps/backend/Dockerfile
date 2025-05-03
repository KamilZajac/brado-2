# --- Stage 1: Install dependencies and build
FROM node:20 as builder

WORKDIR /app

# Copy only package files first for better cache
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/types/package.json packages/types/package.json

# Install root + app + shared dependencies
RUN npm install

# Copy the app and shared code
COPY apps/backend apps/backend
COPY packages/types packages/types

# Build the shared lib first (if needed)
RUN cd packages/types && npm run build

# Build the backend app
RUN cd apps/backend && npx run build

# --- Stage 2: Create production image
FROM node:20-slim

WORKDIR /app

# Copy only the built code
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json

RUN npm install --only=production

CMD ["node", "dist/main.js"]
