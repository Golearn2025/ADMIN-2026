# Admin VAT preview — UI-only layer

## Model (unchanged)

- **DB & engine:** NET amounts only (`*_pence` columns).
- **Website:** applies `organization_settings.vat_rate` at quote time.
- **Admin:** edit NET; preview shows client-facing gross.

## Components

| File | Role |
|------|------|
| `components/pricing/pricingVatPreview.ts` | Parse NET input, VAT math, `hasPenceColumns()` |
| `components/pricing/PenceWithVatPreview.tsx` | Stacked helper under each £ input |
| `components/pricing/PricingVatBanner.tsx` | Tab banner when section has £ fields |
| `app/(admin)/prices/page.tsx` | Wires preview to all `type: "pence"` columns |

## VAT rate source

`GET/PATCH /api/admin/organization-settings` → `vat_rate_percent` (loaded on Prices page mount).

## Sections with preview

Any tab whose column defs include `type: "pence"`:

- Vehicle Rates (oneway, hourly, daily, fleet_*)
- Daily rules (extra hour/mile NET fields)
- Airport Fees
- Zone Fees
- Extras Items
- Versions (multi-stop fee)
- Rounding (step)
- Driver Bonuses (payout £)

## Sections without £ inputs

- Hourly tab (hours only) — rates on Vehicle Rates
- Fleet tab (% discount only) — rates on Vehicle Rates
- Time rules (multipliers)
- VAT & Commission (percent fields)

## Example under input (£70 @ 20% VAT)

```
NET (ex VAT)
[ £ 70.00 ]

NET £70.00
VAT £14.00 (20%)
FINAL WEBSITE PRICE £84.00 incl. VAT
```

## Deploy notes

- No migration.
- No backend pricing engine changes.
- Safe to deploy admin only.
