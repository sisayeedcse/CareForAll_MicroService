# Use a lightweight Node.js image for production builds
FROM node:20-alpine AS base

# Set working directory inside the container
WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the remaining application source code
COPY . .

# Set environment variables required for production
ENV NODE_ENV=production \
    PORT=3001

# Document the port that the container listens on
EXPOSE 3001

# Start the user service
CMD ["npm", "start"]
