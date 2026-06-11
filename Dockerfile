# Multi-stage build for NestJS
FROM node:24-alpine AS base
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
# APP_VERSION is supplied by CI (computed from the PR title — see
# .github/scripts/next-version.sh); package.json in git is a 0.0.0-dev
# placeholder. Stamping happens after npm ci so dependency layers stay cached.
FROM dependencies AS build
RUN apk add --no-cache bash perl
COPY . .
ARG APP_VERSION
RUN [ -z "$APP_VERSION" ] || npm version "$APP_VERSION" --no-git-tag-version
RUN npm run build:prod

# Production stage
FROM base AS production
COPY package*.json ./
RUN npm ci --omit=dev
ARG APP_VERSION
RUN [ -z "$APP_VERSION" ] || npm version "$APP_VERSION" --no-git-tag-version
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]