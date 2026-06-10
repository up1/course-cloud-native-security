# =============================================================
# Multi-stage build -> small, non-root, distroless runtime image
# =============================================================
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY app.js ./

# --- Runtime: distroless (no shell, runs as nonroot UID 65532) ---
FROM gcr.io/distroless/nodejs24-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app /app
EXPOSE 3000
USER 65532
CMD ["app.js"]
