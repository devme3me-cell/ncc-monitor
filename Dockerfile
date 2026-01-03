# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.12.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the backend server
RUN pnpm build

# Production stage
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@9.12.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built server from builder
COPY --from=builder /app/dist ./dist

# Copy static web files
COPY --from=builder /app/dist ./public

# Copy necessary runtime files
COPY server ./server
COPY drizzle ./drizzle
COPY shared ./shared
COPY scripts ./scripts

# Expose ports
EXPOSE 3000 8081

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
