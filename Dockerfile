# Multi-stage build for NestJS
FROM node:24-alpine3.23 AS base
RUN npm install -g npm@latest
WORKDIR /app
COPY package*.json ./

# Dependencies stage
FROM base AS dependencies
RUN npm ci

# Development stage
FROM dependencies AS development
RUN apk add --no-cache bash perl
COPY . .
CMD ["npm", "run", "start:dev"]

# Build stage
FROM dependencies AS build
RUN apk add --no-cache bash perl
COPY . .
RUN npm run build:prod

# Production stage
FROM base AS production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]