# STAGE 1: Build & Optimization
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source and build frontend
COPY . .
RUN npm run build

# STAGE 2: Production Runtime
FROM node:20-slim

# Install minimal system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libgbm-dev \
    libnss3 \
    libasound2 \
    libxshmfence1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production package info
COPY package*.json ./
RUN npm install --production

# Install only the required browser engine
RUN npx playwright install --with-deps chromium

# Copy built frontend assets and backend source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/.env.example ./ .env

# Production environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Expert Tip: Using 'node' directly instead of 'npm start' for better signal handling
CMD ["node", "server/index.mjs"]
