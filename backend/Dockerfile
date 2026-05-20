# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Copy configuration files
COPY package.json ./
RUN npm install

# Copy source code files
COPY tsconfig.json server.ts ./
COPY src/ ./src/

# Compile application using esbuild bundle
RUN npm run build

# Stage 2: Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Copy packaged configuration
COPY package.json ./

# Install only production dependencies
RUN npm install --production

# Copy compiled executable and sources
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

CMD ["node", "dist/server.js"]
