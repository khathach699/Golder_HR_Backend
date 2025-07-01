# Optimized multi-stage build for Golder HR Backend

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Stage 2: Development stage
FROM node:18-alpine AS development

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including development dependencies
RUN npm ci && npm install -g nodemon

# Copy tsconfig and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Create uploads directory for file uploads
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start the application with nodemon for hot reload
CMD ["nodemon", "--watch", "src", "--exec", "ts-node", "src/server.ts"]

# Stage 3: Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory for file uploads
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]
