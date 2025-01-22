# Build stage
FROM node:20.12.2 AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy all files
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:20.12.2-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --production --frozen-lockfile

# Copy built assets from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/src ./src

# Expose port
ENV PORT=4001
EXPOSE 4001

# Start the server
CMD ["yarn", "start"]
