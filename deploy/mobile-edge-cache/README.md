# Mobile clinical resilience

Kakamega Mobile can keep doctor consultation, pharmacy, and cashier workflows running when the main HMIS web UI or API is temporarily unavailable.

## Architecture (recommended)

```
┌─────────────────┐     periodic pull      ┌──────────────────┐
│  Main HMIS API  │ ◄──────────────────────│  Mobile app      │
│  /api/mobile/*  │                        │  AsyncStorage    │
└────────┬────────┘                        │  + outbox queue  │
         │                                  └────────┬─────────┘
         │ poll every 5 min                           │
         ▼                                            │ push when online
┌─────────────────┐                                   │
│  Edge cache     │ ◄── optional fallback URL ────────┘
│  (LAN server)   │
└─────────────────┘
```

### Layer 1 — Mobile offline-first (implemented)

- **`GET /api/mobile/clinical-snapshot`** bundles today's queue, pending invoices, medications, drug stock, lab test types, and today's medical records.
- Mobile stores the snapshot in AsyncStorage and refreshes every **5 minutes** while logged in, plus on login and when connectivity returns.
- **`POST /api/mobile/consultations/sync`** saves consultations idempotently (`clientActionId`) — medical record + optional prescription + queue status in one transaction.
- If HMIS is down during save, the consultation is queued locally and replayed when the network returns.

### Layer 2 — Edge cache (optional, for full HMIS outage)

Run `deploy/mobile-edge-cache/server.js` on a small LAN VM or Raspberry Pi at the hospital:

```bash
HMIS_API_URL=https://kakamega.intellibizafrica.co.ke \
HMIS_SERVICE_TOKEN=<long-lived-jwt> \
PORT=8090 \
node deploy/mobile-edge-cache/server.js
```

The edge service polls the main HMIS snapshot and serves the last good copy at `/api/mobile/clinical-snapshot`. Configure mobile `API_FALLBACK_URL` to `http://192.168.x.x:8090` in a future build or via MDM.

**Why not duplicate the whole HMIS?** A read-only edge cache is simpler to operate than a second full stack. Writes still go to HMIS when it recovers; the mobile outbox holds them until then.

### Layer 3 — What stays online-only

- Real-time billing settlement, M-Pesa STK, inventory FIFO allocation, and cross-department workflow still require the main API when it is up.
- Offline consultations create medical records and basic prescriptions on sync; complex web-only flows (radiology scheduling, consumables invoicing) remain web-first.

## Database

Apply migration `79_mobile_consultation_sync.sql` for idempotent replay logging.

## Mobile version

Doctor flow in v1.0.7+:

1. **Queue** → Call patient → **Start serving** opens consultation form
2. Save consultation (offline-capable)
3. **Save & complete queue** marks patient done when synced

## Operations checklist

1. Apply migration 79 on production MySQL
2. Deploy API with `/api/mobile` routes
3. Publish mobile APK 1.0.7
4. (Optional) Deploy edge cache on hospital LAN with service account JWT
