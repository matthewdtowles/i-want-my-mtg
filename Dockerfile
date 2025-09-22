# Multi-stage build for NestJS
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dependencies stage
FROM base AS dependencies
RUN npm ci

# Development stage
FROM dependencies AS development
COPY . .
CMD ["npm", "run", "start:dev"]

# Build stage
FROM dependencies AS build
COPY . .
RUN npm run build

# Production stage
FROM base AS production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/http/public ./dist/http/public
EXPOSE 3000
CMD ["npm", "run", "start:prod"]