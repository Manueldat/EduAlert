FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci
COPY . .
RUN npm run build
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "scripts/container-start.mjs"]
