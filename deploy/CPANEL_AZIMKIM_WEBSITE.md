# Deploy AZIMKIM marketing site to cPanel

The site lives in **`website/azimkim/`**. It is plain HTML/CSS/JS — ideal for shared hosting.

## Quick steps

1. Build zip (optional): `./deploy/package-azimkim-website.sh`
2. Log in to cPanel → **File Manager** → document root (`public_html` or subdomain folder).
3. Upload and extract `dist/azimkim-website.zip`, or upload the folder contents via SFTP.
4. Enable **AutoSSL** for the hostname.
5. Uncomment HTTPS redirect in `website/azimkim/.htaccess` after SSL is active.

Full instructions: [website/azimkim/README-CPANEL.md](../website/azimkim/README-CPANEL.md)

## Suggested hostnames

Use whatever domain you register for AZIMKIM (e.g. `azimkiminvestments.co.ke`). Update HMIS vendor/website fields in deployment env after DNS propagates.

## What to tell assessors / partners

- **Company site:** public URL (this deployment)
- **Product:** AZ CarePlus HMIS — overview at `/az-careplus.html`
- **Contact:** azimkiminvestments@gmail.com
