FROM node:18-alpine AS build
WORKDIR /app


COPY package*.json ./
RUN npm ci --ignore-scripts

COPY src ./src
COPY public ./public

RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
