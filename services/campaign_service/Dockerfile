# Build a lightweight production image for the campaign service
FROM node:20-alpine AS base

# Define application directory
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the service source code
COPY . .

# Set runtime environment variables
ENV NODE_ENV=production \
    PORT=3002

# Document exposed port
EXPOSE 3002

# Launch the campaign service
CMD ["npm", "start"]
