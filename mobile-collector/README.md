# Kakamega Field (`mobile-collector/`)

Android companion for **Kakamega County HMIS** — offline forms, chemist dispense, and asset verification.

## Isolation from other county apps

| Setting | Kakamega Field |
|---------|----------------|
| Android package | `com.kakamega.field` |
| App name | Kakamega Field |
| API (production) | `https://kakamega.intellibizafrica.co.ke` |
| API (emulator dev) | `http://10.0.2.2:3222` |
| Storage prefix | `@kakamega_field_*` |

This avoids clashing with Machakos, KEMRI, or IntelliNex field apps on the same device.

## Build

```bash
cd mobile-collector
source env.sh   # optional: JAVA_HOME / ANDROID_HOME
npm install
npm run android:release
```

Publish to Kakamega HMIS:

```bash
npm run release -- --version 1.0.4 --notes "Kakamega branding"
```

Staff download from `/hmis/field-app`.

## Configuration

Edit `src/config/api.ts`:

- `FACILITY_NAME` — default facility label on login
- `API_BASE_URL` — production host (Kakamega only)

For a physical device on your LAN during development, set `API_BASE_URL` to `http://YOUR_LAN_IP:3222`.
