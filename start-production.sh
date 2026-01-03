#!/bin/bash

# NCC Monitor - Production Startup Script

set -e

echo "🚀 Starting NCC Monitor in production mode..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  Warning: .env.production not found. Using default .env file."
    if [ ! -f .env ]; then
        echo "❌ Error: No environment file found. Please create .env.production"
        exit 1
    fi
else
    cp .env.production .env
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install --frozen-lockfile
fi

# Build the backend if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "🔨 Building backend server..."
    pnpm build
fi

# Export web app if dist folder doesn't have HTML files
if [ ! -f "dist/index.html" ]; then
    echo "🌐 Exporting web application..."
    npx expo export --platform web
fi

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm db:push || echo "⚠️  Database migration failed or skipped"

# Start the application
echo "✅ Starting application..."
NODE_ENV=production node dist/index.js
