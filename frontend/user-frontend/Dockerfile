FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
# Use `npm ci` when a lockfile is present, otherwise fall back to `npm install`.
RUN if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi
COPY . .
RUN npm run build

FROM nginx:stable-alpine
RUN mkdir -p /usr/share/nginx/html/user
COPY --from=build /app/dist /usr/share/nginx/html/user
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
