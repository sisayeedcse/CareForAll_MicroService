# Production-ready image for the pledge service
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy rest of the source (including src/ tree)
COPY . .

ENV NODE_ENV=production \
    PORT=3003

EXPOSE 3003

CMD ["npm", "start"]
