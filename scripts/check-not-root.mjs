#!/usr/bin/env node
/**
 * Prevent running Next.js scripts as root.
 * Running as root creates root-owned `.next/` which breaks local development (ChunkLoadError / missing chunks / 500s).
 */

const isPosix = typeof process.getuid === "function"
const uid = isPosix ? process.getuid() : null

if (uid === 0) {
  // eslint-disable-next-line no-console
  console.error("")
  // eslint-disable-next-line no-console
  console.error("❌ Refusing to run dev server as root.")
  // eslint-disable-next-line no-console
  console.error("   This creates root-owned `.next/` and causes ChunkLoadError + missing chunks.")
  // eslint-disable-next-line no-console
  console.error("")
  // eslint-disable-next-line no-console
  console.error("Fix:")
  // eslint-disable-next-line no-console
  console.error("  1) Stop the root server")
  // eslint-disable-next-line no-console
  console.error("  2) sudo chown -R $(whoami):$(whoami) .next || true")
  // eslint-disable-next-line no-console
  console.error("  3) rm -rf .next")
  // eslint-disable-next-line no-console
  console.error("  4) npm run dev")
  // eslint-disable-next-line no-console
  console.error("")
  process.exit(1)
}

