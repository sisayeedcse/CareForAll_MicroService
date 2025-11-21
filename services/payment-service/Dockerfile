# Production container for the payment service
FROM node:20-alpine AS base

# Establish working directory
WORKDIR /app

# Install dependencies via npm ci for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Copy service source after dependencies
COPY . .

# Define runtime settings
ENV NODE_ENV=production \
    PORT=3004

EXPOSE 3004

CMD ["npm", "start"]
