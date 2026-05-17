# skill: settings & mileage rates

## Schema

`mileage_rates(tax_year PK, rate_micro_per_mile, updated_at)`

- `rate_micro_per_mile = cents_per_mile × 10_000` (72.5¢ → 725000)
- Helpers: `src/lib/mileage-rates.ts`

## Server

- `src/server/settings.functions.ts` — `listMileageRates`, `upsertMileageRate`, `getMileageRateForDate`
- `createMileage` resolves rate by trip date year, stores snapshot on entry

## UI

- `/settings` — edit rates per tax year
- Mileage dialog pre-fills rate when trip date changes

## Seed

`scripts/seed.ts` — IRS defaults 2023–2026 (idempotent).
