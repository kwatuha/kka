# Building and Running in Production Mode

This guide explains how to build and run the Next.js app in production mode for faster performance during demos.

## Quick Start

### Option 1: Build and Start Separately

1. **Build the production version:**
   ```bash
   npm run build
   ```
   This compiles all routes and optimizes the app for production.

2. **Start the production server:**
   ```bash
   npm start
   ```
   Or use:
   ```bash
   npm run start:prod
   ```
   (This binds to 0.0.0.0 to allow external connections, same as dev mode)

### Option 2: Build and Start in One Command

```bash
npm run build:prod
```

This will build and immediately start the production server.

## Switching Between Dev and Production

### Development Mode (with hot reload)
```bash
npm run dev
```
- Routes compile on-demand
- Hot module replacement enabled
- Slower initial page loads
- Better for active development

### Production Mode (pre-compiled)
```bash
npm run build && npm start
```
- All routes pre-compiled
- Faster page loads
- No hot reload
- Better for demos/testing performance

## Port Configuration

- **Development mode**: Runs on port 3002 (or as configured)
- **Production mode**: Runs on port 3000 by default (or port 3002 if configured)

Both modes can be configured via environment variables or Next.js config.

## Troubleshooting

### Permission Errors

If you get permission errors when building:

```bash
# Fix permissions on .next directory
sudo rm -rf .next
npm run build
```

This usually happens when the `.next` directory was created by Docker (as root user).

### Port Already in Use

If port 3000 is already in use:

```bash
# Stop the dev server first, then run production
npm start
```

Or specify a different port:
```bash
PORT=3002 npm start
```



