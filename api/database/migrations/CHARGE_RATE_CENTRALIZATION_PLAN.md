# Charge Rate Centralization Plan

This plan centralizes charge pricing into a single rules engine while keeping existing screens and billing flows working during migration.

## Goals

- One source of truth for all price overrides (cash, insurance, ward-specific).
- Deterministic priority: ward-specific overrides general/default pricing.
- Backward compatibility for existing endpoints and screens.
- Safe rollout with rollback option.

## Target Model

- Base catalog remains in `service_charges` (charge code, name, category, base cost).
- Central rule table: `charge_rate_rules`.
  - Dimensions: `payerType`, `providerId`, `wardId`, `wardType`, effective dates.
  - Rule value: `amount`, `priority`.
  - Audit/history: timestamps, notes, source metadata.

## Rule Resolution Priority

For any `(chargeId, payerType, provider, ward, date)`:

1. exact ward rule (`wardId`)
2. ward-type rule (`wardType`)
3. default rule (no ward)
4. highest `priority`
5. latest `startDate`
6. fallback to legacy tables (during transition) and finally `service_charges.cost`

## Implementation Phases

### Phase 1 (implemented now)

1. Add `charge_rate_rules` table with indexes and FKs.
2. Backfill from:
   - `insurance_charge_rates` -> `payerType='insurance'`
   - `inpatient_charge_rates` -> `payerType='cash'`
3. Update resolver to read centralized table first, fallback to legacy tables.
4. Add centralized CRUD API:
   - `GET /api/insurance/charge-rate-rules`
   - `POST /api/insurance/charge-rate-rules`
   - `PUT /api/insurance/charge-rate-rules/:id`
   - `DELETE /api/insurance/charge-rate-rules/:id`
5. Add centralized UI in finance charges page.

### Phase 2 (recommended next)

1. Point Insurance tabs to the centralized API only (read/write).
2. Mark legacy rate endpoints as deprecated in UI.
3. Add API-level validation to prevent overlapping active rules for same exact scope.
4. Add "effective rule trace" in invoice line metadata for auditability.

### Phase 3 (decommission)

1. Freeze writes to legacy tables (`insurance_charge_rates`, `inpatient_charge_rates`).
2. Remove fallback reads in resolver after stable period.
3. Archive legacy tables or keep read-only views for historical reports.

## Rollout Checklist

1. Run migration `add_charge_rate_rules.sql`.
2. Verify row counts after backfill.
3. Test resolver for:
   - insurance + provider
   - cash inpatient with ward override
   - default fallback
4. Validate billing totals on sample admissions/encounters.
5. Train users to use Finance -> Charges -> Centralized charge-rate rules.

## Rollback

If issues occur:

1. Keep `charge_rate_rules` table intact (do not drop).
2. Revert app/backend code to legacy resolver reads.
3. Continue operating on legacy tables.

No destructive migration is required for rollback.

