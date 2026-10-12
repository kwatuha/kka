#!/bin/bash
set -e

echo "🚀 Starting Kiplombe Frontend (Fast Deploy Mode)..."

# Fast deploy mode: code is mounted as volumes, only rebuild if needed

# 1. Check if node_modules exists (from volume or previous run)
if [ -d "node_modules" ] && [ "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "✅ Dependencies already installed"
    MOD_COUNT=$(find node_modules -maxdepth 1 -type d 2>/dev/null | wc -l)
    echo "   Found $MOD_COUNT packages"
else
    echo "📦 Installing dependencies (this will take 3-5 minutes)..."
    npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund 2>&1 | while IFS= read -r line; do
        if echo "$line" | grep -qE "(added|removed|changed|audited|found)"; then
            echo "   $line"
        fi
    done
    echo "✅ Dependencies installation completed!"
fi

# 2. Check if package.json changed (need to reinstall)
if [ -f ".package.json.hash" ]; then
    CURRENT_HASH=$(md5sum package.json 2>/dev/null | awk '{print $1}' || echo "")
    STORED_HASH=$(cat .package.json.hash 2>/dev/null || echo "")
    if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
        echo "📦 package.json changed, reinstalling dependencies..."
        npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund
        echo "$CURRENT_HASH" > .package.json.hash
    fi
else
    # First run - store hash
    md5sum package.json | awk '{print $1}' > .package.json.hash 2>/dev/null || true
fi

# 3. Check if build exists and is valid
BUILD_NEEDED=false

if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
    echo "📦 No build found, building..."
    BUILD_NEEDED=true
elif [ ! -d ".next/standalone" ]; then
    echo "📦 Standalone build missing, rebuilding..."
    BUILD_NEEDED=true
else
    # Check if critical files changed (quick check)
    if [ -f ".next/.last-build" ]; then
        LAST_BUILD=$(cat .next/.last-build 2>/dev/null || echo "0")
        CURRENT_TIME=$(date +%s)
        # Rebuild if older than 1 hour (or if files changed - could be enhanced)
        if [ $((CURRENT_TIME - LAST_BUILD)) -gt 3600 ]; then
            echo "📦 Build is old, rebuilding..."
            BUILD_NEEDED=true
        else
            echo "✅ Build is recent, skipping rebuild"
        fi
    else
        echo "📦 No build timestamp, rebuilding..."
        BUILD_NEEDED=true
    fi
fi

# 4. Build if needed
if [ "$BUILD_NEEDED" = true ]; then
    echo "🧹 Cleaning old build artifacts..."
    rm -rf .next

    echo "📦 Building Next.js application..."
    export DOCKER_BUILD=true
    [ -n "$NEXT_PUBLIC_API_URL" ] && export NEXT_PUBLIC_API_URL && echo "🔗 API URL: $NEXT_PUBLIC_API_URL"

    npm run build || {
        echo "❌ Build failed!"
        exit 1
    }

    # Store build timestamp
    date +%s > .next/.last-build 2>/dev/null || true
    echo "✅ Build completed successfully!"
else
    echo "✅ Using existing build (fast mode)"
fi

# 5. Standalone Mode Configuration (same as before)
if [ -d ".next/standalone" ]; then
    echo "📦 Setting up standalone build..."

    mkdir -p .next/standalone/.next

    # Copy public folder
    if [ -d "public" ]; then
        if [ ! -d ".next/standalone/public" ] || [ "$(find public -type f | wc -l)" -gt "$(find .next/standalone/public -type f 2>/dev/null | wc -l)" ]; then
            echo "   Copying public folder..."
            cp -r public .next/standalone/ 2>/dev/null || true
        fi
    fi

    # Copy static files
    if [ -d ".next/static" ]; then
        ORIGINAL_COUNT=$(find .next/static -type f 2>/dev/null | wc -l)
        STANDALONE_COUNT=$(find .next/standalone/.next/static -type f 2>/dev/null | wc -l)

        if [ ! -d ".next/standalone/.next/static" ] || [ "$STANDALONE_COUNT" -lt "$ORIGINAL_COUNT" ]; then
            echo "   Copying static files to standalone build..."
            rm -rf .next/standalone/.next/static 2>/dev/null || true
            cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
            FINAL_COUNT=$(find .next/standalone/.next/static -type f 2>/dev/null | wc -l)
            echo "   ✓ Static files copied ($FINAL_COUNT files)"
        fi
    fi

    # Copy server files
    if [ -d ".next/server" ]; then
        if [ ! -d ".next/standalone/.next/server" ]; then
            echo "   Copying server files..."
            cp -r .next/server .next/standalone/.next/ 2>/dev/null || true
        fi
    fi

    # Copy build metadata
    if [ -f ".next/BUILD_ID" ]; then
        cp .next/BUILD_ID .next/standalone/.next/ 2>/dev/null || true
    fi
    cp .next/*.json .next/standalone/.next/ 2>/dev/null || true

    echo "✅ Standalone build configured"
fi

# 6. Start the Server
echo "🎯 Starting Next.js server..."

if [ -f ".next/standalone/server.js" ]; then
    echo "🚀 Using standalone mode: node .next/standalone/server.js"
    cd .next/standalone
    exec node server.js
else
    echo "🚀 Using standard mode: npm start"
    exec npm start
fi





