# Multi-stage build for NestJS
FROM node:20-alpine as base
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base as development
RUN npm ci
COPY . .
CMD ["npm", "run", "start:dev"]

# Build stage
FROM base as build
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:20-alpine as production
WORKDIR /app

# Update apk packages to ensure latest security patches
RUN apk update && apk upgrade --no-cache

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["npm", "run", "start:prod"]