# Standalone Dockerfile for the Web frontend (Next.js)
FROM node:22-alpine AS builder

# Set the working directory
WORKDIR /app

# ── Build-time arguments ──────────────────────────────────────────────────────
# NEXT_PUBLIC_* vars must be baked into the client bundle at build time.
# Pass these via docker-compose build.args (or --build-arg on the CLI).
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

# Upstash Redis — accessed on the server during SSG, must also be present at build time
ARG UPSTASH_REDIS_REST_URL
ARG UPSTASH_REDIS_REST_TOKEN
ARG BACKEND_API_URL

# Promote ARGs to ENV so Next.js / Webpack can read them during `next build`
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL \
    UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN \
    BACKEND_API_URL=$BACKEND_API_URL

# Copy package.json to install dependencies first (caching optimization)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the Next.js application
RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Don't run as root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S node-web -u 1001

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set default environment variables
ENV NODE_ENV=production \
    PORT=3000

# Switch to the non-root user
USER node-web

# Expose the port the app runs on
EXPOSE 3000

# Start the application using the standalone server.js
CMD ["node", "server.js"]
