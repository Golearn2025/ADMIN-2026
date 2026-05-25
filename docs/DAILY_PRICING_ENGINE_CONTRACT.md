# Daily pricing — engine contract (read-only audit)

**Backend SSOT:** `Backend-VantageLane-/src/services/FeeCalculators.ts` → `calculateDailyFee()`

## Formula (production)

```
days = request.days || 1
transport_net = days × (daily_rate_pence / 100)   // from pricing_vehicle_rates, booking_type=daily
→ applyMultipliers (pricing_time_rules)
→ applyDiscounts (corporate — usually inactive)
→ max(transport, minimum_fare_pence / 100)
→ + service_items (extras)
→ VAT via QuoteAmountsMapper (organization_settings.vat_rate)
```

## DB columns USED

| Table | Column | Role |
|-------|--------|------|
| `pricing_vehicle_rates` | `daily_rate_pence` | **Primary SSOT — £/day package** |
| `pricing_vehicle_rates` | `minimum_fare_pence` | Floor after multipliers |
| `pricing_vehicle_rates` | `booking_type` | Must be `daily` or `fleet_daily` |
| `organization_settings` | `vat_rate` | Applied after net total |

## DB columns NOT used by engine (admin may still show them)

| Table | Column | Status |
|-------|--------|--------|
| `pricing_daily_rules` | `included_hours` | Text in breakdown description only |
| `pricing_daily_rules` | `included_miles` | Ignored |
| `pricing_daily_rules` | `extra_hour_rate_pence` | Ignored — **no overtime** |
| `pricing_daily_rules` | `extra_mile_rate_pence` | Ignored — **no extra mileage** |
| `pricing_vehicle_rates` | `base_fare_pence` | Ignored for daily rows |
| `pricing_vehicle_rates` | `per_mile_*`, `per_minute_pence` | Ignored for daily rows |

## Engine functions

- `PricingDataService.getVehicleRates(vehicle, 'daily', organizationId)`
- `PricingDataService.getDailyRules()` — **loaded but only `included_hours` in description string**
- `FeeCalculators.calculateDailyFee()`
- `FeeCalculators.finalizeTransportThenServiceItems()`
- `FeeCalculators.applyMinimumFareToFinal()`

## Admin alignment

- Edit **Daily Package Price** → `pricing_vehicle_rates.daily_rate_pence` (filter booking type = `daily`)
- Tab **Daily** rules → informational / future use; fields marked as not implemented in UI
