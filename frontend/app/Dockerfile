# Build stage: compile the Vite app
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Allow overriding the gateway endpoint at build time (defaults to localhost nginx proxy)
ARG VITE_API_BASE_URL="http://localhost:8080"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Runtime stage: serve static assets via nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
