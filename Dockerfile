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

FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx /tmp

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
