# Plan teste — implementare reală (DB izolată + provider fals)

**Interzis:** chei OneSignal/Resend de producție, șoferi reali, push efectiv, apply pe VL NEW.

## Mediu

1. Proiect Supabase **staging** (clone schemă VL NEW, fără date clienți).
2. Worker notificări local / staging cu:
   - `ONESIGNAL_*` → stub (`sendPushToExternalUserId` înregistrează în memorie/fișier)
   - `WORKER_ENABLED=true`, coadă doar pe staging DB
3. Admin pe branch `2026-11-12-v1.5` împotriva staging URL.
4. `waves_enabled_automatic` rămâne **false** până trece checklist-ul.

## Suite A — SQL pe staging (după apply migrări Stage1 pe staging)

| # | Test | Cum |
|---|------|-----|
| A1 | Accept concurrent | 2 sesiuni `psql` / 2 clienți service-role pe același `PENDING` leg; ambele apelează `driver_accept_job(leg)`; exact 1 success |
| A2 | Impersonare | Caller auth=A trimite `p_driver_id=B` → reject |
| A3 | Wave Direct | Run active exclusive=A; B accept → fail; A accept → ok |
| A4 | Wave Premium | Doar premium+vehicul în `notification_events` |
| A5 | Open după timer | `advance_expired…`; Open events fără driverii deja notificați pe Premium |
| A6 | Idempotency | Re-enqueue același key → 0 rânduri noi (`ON CONFLICT DO NOTHING`) |
| A7 | Retry | Marchează delivery `failed_retryable`; worker mock reîncearcă; nu creează al doilea event |
| A8 | Org filter view | Driver alt org nu vede oferta |
| A9 | no_eligible_premium | `start_premium_dispatch_run` → `action_required` (fără Open automat) |

### Pseudocod concurență reală (staging)

```bash
# terminal 1
psql "$STAGING_DB" -c "BEGIN; SELECT driver_accept_job('$LEG'::uuid); -- wait"
# terminal 2 (simultan)
psql "$STAGING_DB" -c "SELECT driver_accept_job('$LEG'::uuid);"
```

Sau Node: două `createClient(service)` cu `Promise.all([rpc, rpc])` pe staging.

## Suite B — Worker mock

| # | Test | Expect |
|---|------|--------|
| B1 | Event cu `driver_id` | 1 send mock |
| B2 | Event Open per-driver | N sends = N events |
| B3 | Event legacy `driver_id null` | Documentat; pe staging preferă a nu exista |

## Suite C — Admin UI pe staging

| # | Test |
|---|------|
| C1 | Direct fără șofer → blocat |
| C2 | Direct + mark paid → 1 event + 1 mock push |
| C3 | Release Premium → doar premium |
| C4 | Open now → non-premium; premium fără al 2-lea push |

## Criteriu GO / NO-GO

- A1–A9 verzi pe staging  
- B1–B2 verzi  
- Nicio livrare OneSignal reală în loguri  
- `waves_enabled_automatic=false` pe VL NEW
