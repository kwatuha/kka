#!/bin/sh
set -e

echo "🚀 Starting Kiplombe Frontend..."

# Ensure .next directory exists and is writable
# The named volume should handle this, but we'll make sure permissions are correct
if [ -d ".next" ] && [ ! -w ".next" ]; then
    echo "⚠️  .next directory exists but is not writable - Next.js will handle this"
fi

# Simple check: does next binary exist?
if [ -f "node_modules/.bin/next" ]; then
    echo "✅ Dependencies already installed, starting dev server..."
else
    echo "📦 Installing dependencies (this will take 2-5 minutes on first run)..."

    # Simple install - let npm handle everything
    if [ -f "package-lock.json" ]; then
        npm ci --legacy-peer-deps --prefer-offline
    else
        npm install --legacy-peer-deps --prefer-offline
    fi

    echo "✅ Dependencies installed successfully!"
fi

# Zoom embedded UI CSS (after node_modules exists — named volume may be empty on first run)
node scripts/copy-zoom-sdk-css.mjs || true

echo "🎯 Starting Next.js dev server on port 3000..."
exec "$@"