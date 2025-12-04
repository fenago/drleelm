# DrLeeLM Backend Dockerfile
# Multi-stage build for smaller production image

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/tsconfig.json ./backend/

# Install all dependencies (including devDependencies for build)
# Using --legacy-peer-deps to resolve @langchain/community peer dependency conflicts
RUN npm ci --legacy-peer-deps

# Copy source code
COPY backend/ ./backend/

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
# Using --legacy-peer-deps to resolve @langchain/community peer dependency conflicts
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/backend/dist ./backend/dist

# Create data directories
RUN mkdir -p data/chats data/notes data/audio && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Environment variables (defaults)
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start the application
CMD ["node", "backend/dist/src/core/index.js"]
