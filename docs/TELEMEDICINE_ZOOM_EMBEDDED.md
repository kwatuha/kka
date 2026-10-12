# Telemedicine — Zoom embedded video (Component View)

HMIS can show the Zoom meeting **inside the page** (floating panel or full session page) using the official `@zoom/meetingsdk` **Component View** (`zoomAppRoot`), instead of only opening a new window.

## 1. Where do the credentials come from? (Zoom Marketplace)

Zoom has **renamed** fields in the developer console. For a **Meeting SDK** app you usually see:

| In the Zoom Marketplace UI | Use in HMIS API env (any one pair) |
|----------------------------|-------------------------------------|
| **Client ID** | `ZOOM_CLIENT_ID` **or** `ZOOM_MEETING_SDK_KEY` |
| **Client Secret** | `ZOOM_CLIENT_SECRET` **or** `ZOOM_MEETING_SDK_SECRET` |

Those values are **not** the same as “Server-to-Server OAuth” credentials from a different app type — you need an app whose product is **Meeting SDK** (or General App that includes Meeting SDK), then open **App Credentials**.

**Typical navigation:**

1. [Zoom App Marketplace](https://marketplace.zoom.us/) → **Develop** → **Build App** (or your existing app).
2. Choose **Meeting SDK** (or create a **General App** and enable Meeting SDK if that’s what Zoom shows in your account).
3. Open the **App Credentials** (or **SDK** / **Credentials**) section.
4. Copy **Client ID** and **Client Secret** (you may need to click **View** or **Generate** for the secret once).

Official doc: [Get Meeting SDK credentials](https://developers.zoom.us/docs/meeting-sdk/get-credentials/).

> If you only see “OAuth” wording: for many current apps, **Client ID** = the public identifier and **Client Secret** = the HMAC secret used to sign the Meeting SDK JWT. That matches what HMIS puts in `appKey` / `sdkKey` and the signing key in our Node route.

## 2. API server environment

Set these on the **Node API** (not only the Next.js frontend). **Either** naming style works:

```env
# Style A — matches Marketplace labels
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
```

```env
# Style B — legacy / docs naming
ZOOM_MEETING_SDK_KEY=your_client_id_here
ZOOM_MEETING_SDK_SECRET=your_client_secret_here
```

**Where to put them**

| How you run the API | File to edit |
|---------------------|--------------|
| **Docker Compose (dev)** (`docker compose up`) | Project root **`.env`**. The `api` service uses `env_file: .env`. |
| **Docker Compose (production deploy)** (`docker compose -f docker-compose.deploy.yml …`) | Same: **`docker-compose.deploy.yml`** now includes **`env_file: .env`** on the **`api`** service. Put `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` (or `ZOOM_MEETING_SDK_*`) in **`~/kiplombe-hmis/.env` on the server**, then **`docker compose … up -d`** (or re-run **`remote-deploy-fast.sh`**) so the API container picks them up. If you skip this, the UI will never show **Show video in panel** because `/api/telemedicine/zoom-meeting-sdk-status` returns `configured: false`. |
| **Local Node** (`nodemon` / `node app.js` from `api/`) | **`api/.env`** (copy from **`api/.env.example`**). `dotenv` loads from the `api` working directory. |

The API signs a short-lived JWT (`HMAC-SHA256`) and returns it to the browser. **Never** generate this signature in frontend code.

Restart the API (or containers) after changing env vars.

If Compose reports a missing `.env` file, create it: `cp .env.example .env` and fill in values.

## 3. Official `zoom-sdk-web` sample zip — how it relates

The downloadable **Zoom Meeting SDK Web Sample** (e.g. `zoom-sdk-web-5.1.4/`) matches what HMIS does:

| Sample folder | Role |
|---------------|------|
| `Components/` | **Component View** — same idea as our `ZoomEmbeddedMeeting` + `@zoom/meetingsdk/embedded`. |
| `Local/` / `CDN/` | **Client View** — full-page `ZoomMtg` (different UI mode). |

The sample **does not** put secrets in the browser. It expects a **small auth server** that returns a `signature` JWT:

- README tells you to clone `meetingsdk-auth-endpoint-sample` and set `.env` with **`CLIENT_SECRET`** or **`ZOOM_MEETING_SDK_SECRET`** — same secret as above.
- `Components/public/tools/nav.js` calls `POST http://127.0.0.1:4000` with `{ meetingNumber, role }` and uses `data.signature` in the join URL — equivalent to our `POST /api/telemedicine/sessions/:sessionId/zoom-sdk-signature`.

So: **your Client ID + Client Secret from the Meeting SDK app** are what belong in the API environment; the zip is mainly UI examples + the same join flow.

## 4. Join URL format

The embed parser expects a **standard** join link containing `/j/` and the numeric meeting id, for example:

- `https://zoom.us/j/12345678901`
- `https://us02web.zoom.us/j/12345678901?pwd=...`

Vanity links without a numeric meeting id in the path may not work with the Meeting SDK.

## 5. Optional: Cross-Origin isolation (gallery / virtual backgrounds)

For best performance (e.g. gallery view, some media features), Zoom recommends **Cross-Origin-Embedder-Policy** and **Cross-Origin-Opener-Policy** on the document.

This repo supports an opt-in flag at **Next.js build time**:

```bash
ENABLE_ZOOM_COEP_HEADERS=true npm run build
```

This adds (via `next.config.mjs`):

- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

**Warning:** This can affect other third-party scripts or assets site-wide. In production, you can set the same headers on your reverse proxy (e.g. nginx) instead of or in addition to Next.

## 6. UI

When the API reports credentials as configured (`GET /api/telemedicine/zoom-meeting-sdk-status`), the telemedicine session panel shows **Show video in panel**. That loads the embedded client into a `div` in the panel.

If join fails, try **Participant (0)** vs **Host (1)** in the embed controls, and confirm the Zoom user is allowed to join that meeting.

## 7. Toolbar: mic / video look “inactive” after embed loads

If the meeting **embeds successfully** (you see the Zoom UI and your name) but **headset / muted camera** icons seem inactive:

1. **Join audio first** — Zoom expects you to click **Join audio** (headset) and pick **Computer audio** before the mic is live. Until then, the toolbar shows the headset icon, not an active mic.
2. **Browser permissions** — When you join audio or start video, the browser should prompt for **microphone** and **camera**. If you blocked them earlier, reset permissions for this site (lock icon in the address bar).
3. **Secure context** — `getUserMedia` only works on **HTTPS** or **http://localhost**. Plain HTTP on a LAN IP may leave media controls unusable.
4. **Cross-Origin isolation** — Some advanced media features work better with **COEP/COOP** (see §5). If the SDK’s `checkSystemRequirements()` reports `audio: false` or `video: false`, try a supported browser or enable those headers in production.

This is normal Zoom UX, not necessarily a failed embed.

## 8. `RECONNECTING_MEETING` or constant reconnect (especially local dev)

If the meeting **briefly embeds** then **reconnects in a loop** and ends with **`RECONNECTING_MEETING`** or a similar error:

1. **React Strict Mode** — Next.js sets `reactStrictMode: true` in `next.config.mjs`. In development, React **mounts → unmounts → remounts** components once to surface side-effect bugs. That **cleans up** the Zoom embed (`leaveMeeting` / `destroyClient`) while the SDK is still connecting, which can trigger reconnect storms. **Production builds** (`npm run build` / Docker) do not double-mount the same way.
2. **Effect re-runs** — The embed only re-inits when **`sessionId`**, **`sdkRole`**, or **`sdkRuntimeReady`** change. User name/email are read from refs so **auth hydration** does not restart the meeting.
3. **If you still need to debug** — Temporarily set `reactStrictMode: false` in `next.config.mjs` while testing Zoom locally (revert afterward).

The `ZoomEmbeddedMeeting` component uses a **generation guard** so async `init`/`join` from a **previous** effect run is ignored after teardown.

## 9. `Zoom SDK join timed out`

The embed waits up to **~2 minutes** for `join` (first load may download wasm/media from Zoom CDNs). If you still see a timeout:

1. **Network / firewall** — Allow browser access to `*.zoom.us` / `source.zoom.us` (including `wss://` WebSockets). Corporate proxies often block these.
2. **Slow link** — Retry; the Meeting SDK pulls several assets on first join.
3. **Callbacks** — The client uses Zoom’s `success` / `error` join callbacks **and** the returned promise so joins aren’t marked failed when only one path completes.

## 10. Frontend: `npm install` and CSS resolution

- **Yes — install dependencies** where Next.js runs: at the **project root** (same folder as `package.json`), run `npm install` so `@zoom/meetingsdk` exists under `node_modules/`.
- **Docker (frontend service):** Ensure the image or entrypoint runs `npm install` (or your volume includes `node_modules`). If `node_modules` is empty inside the container, the Zoom package (and the CSS file) will be missing.
- **`Module not found … zoom-meetingsdk.css` / dev overlay `BuildError`:** Zoom’s CSS is **copied** to `public/vendor/zoom-meetingsdk.css` by `npm run copy-zoom-css` (also **`postinstall`**, **`predev`**, **`docker-entrypoint-frontend.sh`** after install, and before **`npm run build`**). The script only uses paths under `node_modules/…` (no `require.resolve`), so it won’t crash if deps aren’t ready yet in Docker — run **`npm install`** in the container / wait for the entrypoint to finish, then the copy will succeed on the next start or when you hit **Show video in panel** (predev runs again).
- **`Cannot find module '@zoom/meetingsdk/embedded'` / `Can't resolve ...embedded.js`:** We no longer import embedded code through the bundler. The app loads `/vendor/zoomus-websdk-embedded.umd.min.js` at runtime (copied by `scripts/copy-zoom-sdk-css.mjs`) and uses `window.ZoomMtgEmbedded`. If this fails, run `npm run copy-zoom-css`, confirm the file exists under `public/vendor/`, and restart the dev server.
- **`ReactCurrentOwner ... __SECRET_INTERNALS... is undefined` while loading runtime:** this is typically a React 19 vs Zoom UMD runtime mismatch. HMIS now loads Zoom’s bundled React 18 vendor scripts (`/vendor/zoom-react18.min.js`, `/vendor/zoom-react-dom18.min.js`) before the embedded runtime.

## 11. Embedded video looks small in the panel (empty space beside it)

The Meeting SDK **Component View** draws into a fixed-size box. HMIS sets **`viewSizes`** from the container, defaults to **speaker** view (larger main tile), and syncs on resize.

- Use **Larger video area** / **Smaller video area** above the embed to grow the box (calls `updateVideoOptions` via `ResizeObserver`; no re-join).
- The floating panel width was increased (`telemedicine-floating-panel.tsx`); use **Open full page** (external link) if you need the whole screen.

## 12. “Compiling” on every page; header errors while video still says “joining”

In **`next dev`**, routes compile **on first visit** — there is no full pre-compile. That can make the shell (header, layout) and API calls finish at different times than the Zoom embed (which loads scripts asynchronously and may show **joining** for a long time). That’s usually **not** one single app bug.

To test embedded Zoom without per-route dev compilation, run a **production** server locally:

```bash
npm run preview
```

See **`docs/LOCAL_NEXT_DEV.md`** for ports, trade-offs, and when to use `dev` vs `preview`.
