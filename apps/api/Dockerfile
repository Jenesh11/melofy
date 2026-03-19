# Standalone Dockerfile for the API (backend only)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy ONLY the api app's package.json
COPY package.json ./

# Install dependencies (this will create a fresh lockfile in the container)
RUN npm install

# Copy source code and config
COPY . .

# Build from TypeScript to JavaScript
RUN npm run build

# Stage 2: Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Don't run as root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S node-api -u 1001

# Copy compiled code and node_modules from builder
# We only need the node_modules, dist and the app's package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Add environment variables
ENV NODE_ENV=production \
    PORT=3001

USER node-api

EXPOSE 3001

# Start using the compiled index.js
CMD ["node", "dist/index.js"]
