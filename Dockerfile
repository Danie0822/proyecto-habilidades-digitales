# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./
RUN --mount=type=secret,id=vite_env,required=false \
    if [ -f /run/secrets/vite_env ]; then cp /run/secrets/vite_env .env; fi && \
    npm run build && \
    rm -f .env

FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app && npm install -g serve@14.2.6

COPY --from=builder /app/dist ./dist

USER app
EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080", "--no-port-switching"]
