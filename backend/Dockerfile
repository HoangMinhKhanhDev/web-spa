# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm install

# Copy backend source and prisma schema
COPY backend/ ./
COPY frontend/ ../frontend/

# Generate Prisma Client
RUN npx prisma generate

# Production Stage
FROM node:20-alpine

WORKDIR /app/backend

# Copy built assets and node_modules from builder
COPY --from=builder /app/backend ./
COPY --from=builder /app/frontend ../frontend/

# Create logs and uploads directories
RUN mkdir -p logs uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the application port
EXPOSE 5000

# Start script: Run migrations and then start the server
CMD ["sh", "-c", "npx prisma db push && npm start"]
