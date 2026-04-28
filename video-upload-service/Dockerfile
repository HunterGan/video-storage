# Stage 1: Builder
FROM rust:1.91-slim-bullseye AS builder

RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo fetch --locked

# Build source
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release --locked

# Stage 2: Runtime
FROM debian:bullseye-slim

RUN apt-get update && \
    apt-get install -y ca-certificates libssl1.1 curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 appuser

COPY --from=builder /app/target/release/video_upload_service .
COPY --from=builder /app/migrations ./migrations

RUN chown -R appuser:appgroup /app && \
    chmod +x /app/video_upload_service

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["./video_upload_service"]