# Multi-stage build for Rust
FROM rust:1.88-alpine as base
WORKDIR /app
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static

# Development stage
FROM base as development
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build
COPY src ./src
CMD ["cargo", "run"]

# Build stage  
FROM base as build
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

# Production stage
FROM alpine:latest as production
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /app/target/release/scry ./scry
CMD ["./scry"]
