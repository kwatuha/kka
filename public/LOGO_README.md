# AZ CarePlus logo assets

## Primary files

| File | Use |
|------|-----|
| `az-careplus-logo.png` | Full-colour mark (general / login light areas) |
| `az-careplus-logo-sidebar.png` | **Sidebar / dark chrome** (from AZCarePlusLogoDarker) |
| `az-careplus-logo-print.png` | **Reports & white paper** (from azCarePlusLogoReports) |
| `az-careplus-logo.svg` | Vector fallback |
| `az-careplus-icon.svg` | Favicon-style icon, collapsed nav |

The app loads these automatically via `HospitalLogoImage`. If all assets fail, the vector `AzCarePlusLogo` component is shown.

**Local dev:** PNGs may be missing until you sync from UAT (same files as production static host):

```bash
chmod +x scripts/sync-careplus-logos-from-uat.sh
./scripts/sync-careplus-logos-from-uat.sh
```

Then hard-refresh `http://localhost:5400/hmis/login` (Docker bind-mounts `public/` live).

## Override via environment

```bash
NEXT_PUBLIC_LOGO_PATH=/az-careplus-logo.png
NEXT_PUBLIC_LOGO_SIDEBAR_PATH=/az-careplus-logo-sidebar.png
NEXT_PUBLIC_LOGO_PRINT_PATH=/az-careplus-logo-print.png
```

Per-branch logos can still be set in Administration → branches.

## Legacy

`kakamega-facility-logo.svg` is no longer used in the default logo chain. Remove or replace on the server if you deploy custom branding.
