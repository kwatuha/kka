#!/usr/bin/env node
/**
 * Copy Zoom Meeting SDK assets into public/ (no bundler import of deep package paths).
 * Uses filesystem paths from project root only — no require.resolve (avoids failures when
 * node_modules is empty on first Docker start or lives in a named volume).
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const cssSrc = path.join(root, "node_modules/@zoom/meetingsdk/dist/ui/zoom-meetingsdk.css")
const embeddedJsSrc = path.join(root, "node_modules/@zoom/meetingsdk/dist/zoomus-websdk-embedded.umd.min.js")
const embeddedEs5Src = path.join(root, "node_modules/@zoom/meetingsdk/dist/zoom-meeting-embedded-ES5.min.js")
const react18Src = path.join(root, "node_modules/@zoom/meetingsdk/dist/lib/vendor/react.min.js")
const reactDom18Src = path.join(root, "node_modules/@zoom/meetingsdk/dist/lib/vendor/react-dom.min.js")
const destDir = path.join(root, "public/vendor")
const cssDest = path.join(destDir, "zoom-meetingsdk.css")
const embeddedJsDest = path.join(destDir, "zoomus-websdk-embedded.umd.min.js")
const embeddedEs5Dest = path.join(destDir, "zoom-meeting-embedded-ES5.min.js")
const react18Dest = path.join(destDir, "zoom-react18.min.js")
const reactDom18Dest = path.join(destDir, "zoom-react-dom18.min.js")

if (
  !fs.existsSync(cssSrc) ||
  !fs.existsSync(embeddedJsSrc) ||
  !fs.existsSync(embeddedEs5Src) ||
  !fs.existsSync(react18Src) ||
  !fs.existsSync(reactDom18Src)
) {
  console.warn(
    "[copy-zoom-sdk-css] Skip: Zoom SDK assets not found at node_modules/... (run npm install in project root / wait for container install)."
  )
  process.exit(0)
}

try {
  fs.mkdirSync(destDir, { recursive: true })
  fs.copyFileSync(cssSrc, cssDest)
  fs.copyFileSync(embeddedJsSrc, embeddedJsDest)
  fs.copyFileSync(embeddedEs5Src, embeddedEs5Dest)
  fs.copyFileSync(react18Src, react18Dest)
  fs.copyFileSync(reactDom18Src, reactDom18Dest)
  console.log("[copy-zoom-sdk-css] → public/vendor/zoom-meetingsdk.css")
  console.log("[copy-zoom-sdk-css] → public/vendor/zoomus-websdk-embedded.umd.min.js")
  console.log("[copy-zoom-sdk-css] → public/vendor/zoom-meeting-embedded-ES5.min.js")
  console.log("[copy-zoom-sdk-css] → public/vendor/zoom-react18.min.js")
  console.log("[copy-zoom-sdk-css] → public/vendor/zoom-react-dom18.min.js")
} catch (e) {
  console.warn("[copy-zoom-sdk-css] Skip:", e instanceof Error ? e.message : e)
  process.exit(0)
}
