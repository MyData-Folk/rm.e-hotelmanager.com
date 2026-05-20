# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency configuration
COPY package.json ./
RUN npm install

# Copy source code and other files
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/

# Accept VITE_API_URL as a build arg and bake it in
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build static React SPA assets
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
