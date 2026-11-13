# Raport Stage 1 — actualizat (fără apply / deploy / notificări reale)

**Data:** 2026-11-12 (revizie review)  
**Branch review:** `review/dispatch-stage1-corrections-2026-11-12`  
**Artefacte:** `docs/dispatch-stage1/**` (NU în `supabase/migrations` de apply)

---

## 1. Deploy-uri Render / live (confirmate vs probe locale)

| Serviciu | Commit pe GitHub `main` | Runtime live | Dovadă |
|----------|-------------------------|--------------|--------|
| **Admin** `admin-2026.onrender.com` | `af06efa` (`main`) | **Confirmat live = `af06efa`** (verificare ChatGPT + aliniere GitHub `main`/`HEAD`) | Host răspunde pe Render (`x-render-origin-server: Render`). HTML `/login` nu expune SHA în bundle public (buildId Next ascuns în chunk hashes) — confirmarea SHA rămâne pe Deploy history Render / verificare ChatGPT citată de ops. |
| **Backend notificări** | `6502611` (`main`; fix targeting `11a34779`) | **Confirmat live = `6502611`** (verificare ChatGPT) | Cod targeting pe GitHub main. Cron/pg pe VL NEW: `advance_expired_job_dispatch_waves` activ `* * * * *`. |
| **Driver** | `4986126` | `4986126` | GitHub main = HEAD local |

**Probe locale (fără redeploy):**  
- Admin Render: HTTP 307 → `/login`, header Render OK.  
- Nu am declanșat deploy nou.  
- Stage1 migrations **încă absente** din `schema_migrations` pe VL NEW.

`waves_enabled_automatic = false` pe org Vantage Lane (neschimbat).

---

## 2. `driver_accept_job` — corecții noi pe review

### 2.1 Overload JSONB `(leg_id, driver_id?)`

- `auth.uid()` obligatoriu; reject impersonare
- Org match
- **Booking părinte:** neșters + `CONFIRMED` + plată `succeeded` (`booking_parent_is_accept_ready`)
- Vehicle eligibil (orice mașină match model/categorie)
- Wave guard + `UPDATE … assigned_driver_id IS NULL` atomic

### 2.2 Overload boolean `(driver_id, vehicle_id, leg_id)`

Nu mai e suficient `can_receive_jobs` din view. Verifică **mașina selectată**:

| Check | Cum |
|-------|-----|
| Proprietar | `vehicles.driver_id = p_driver_id` |
| Organizație | `vehicles.organization_id = leg.organization_id` (+ view org) |
| Eligibilitate | `driver_app_vehicle.can_receive_jobs IS TRUE` |
| Model/categorie | `model_id` / `category_id` cerute de `booking_legs` |
| Identitate | `auth.uid()` → driver self |
| Booking părinte | același helper ca JSONB |
| Atomic | `FOR UPDATE` + `UPDATE … IS NULL` |

Helper nou: `driver_selected_vehicle_matches_leg(...)`.

### 2.3 Grants accept

`REVOKE` PUBLIC/anon; `GRANT` authenticated + service_role.  
**Notă:** service_role **fără** `auth.uid()` tot e respins la runtime (`Authentication required`) — intentional pentru anti-impersonare. Testele de concurență **trebuie** JWT-uri distincte (vezi §7).

---

## 3. Funcții interne dispatch — autorizare

| Funcție | Înainte (live) | Review |
|---------|----------------|--------|
| `enqueue_dispatch_wave_notifications` | EXECUTE PUBLIC/anon/authenticated | Auth check `dispatch_caller_can_manage_org`; **REVOKE** PUBLIC/anon/authenticated; **GRANT** service_role |
| `start_premium_dispatch_run` | (propunere anterioară fără gate) | Backend **sau** org member / super-admin; REVOKE PUBLIC/anon; GRANT service_role + authenticated (gate intern) |
| `advance_expired_job_dispatch_waves` | EXECUTE PUBLIC/anon | Doar `dispatch_caller_is_backend()` / super-admin; REVOKE PUBLIC/anon/authenticated; GRANT service_role |

Compatibilitate:

- **Cron** `SELECT advance_expired…` ca `postgres`/`supabase_admin` → `dispatch_caller_is_backend()` OK.
- **Payment trigger** SECURITY DEFINER → apelează `start_premium…` ca owner → OK.
- **Admin API** `admin.rpc(...)` cu service-role → OK.
- Caller `authenticated` fără `is_org_member` → deny.

---

## 4. Fără Premium eligibil — **Opțiunea A (aprobată)**

`start_premium_dispatch_run`:

1. Dacă există Premium eligibil (vehicul) → wave `premium` + timer + notify Premium.
2. Dacă **0** Premium eligibil → creează wave **`open` activ**, notify eligibili pe model/categorie, `reason=no_eligible_premium_open_immediately`.
3. **Direct** activ rămâne blocant (nu se pornește Premium/Open peste Direct).
4. Nu lăsăm leg PENDING **fără** run activ în acest flux.

Payment trigger: tratează `success:true` (premium sau open-imediat) la fel.

---

## 5. Open — ne-notificați + Premium adăugat între timp + retry

### Destinatari Open

- Toți șoferii org eligibili pe vehicul **care nu au** deja event `driver_job_available` pe job.
- **Include** Premium adăugat după enqueue Premium (au ratat push-ul).
- **Exclude** pe cei deja notificați (Premium/Direct/Open anterior).
- Nu mai filtrăm Open după lista Premium curentă.

Detalii: `backend-patches/OPEN_WAVE_AND_RETRY_PATH.md`.

### Retry (cale reală, mock pe staging)

1. Event **creat** (`pending`)  
2. Delivery **provider_accepted** (+ `provider_message_id`)  
3. Eșec → **failed_retryable** + `next_retry_at`  
4. Polling re-claim **același** `event.id` — fără al doilea idempotency key  
5. `RetryWorker` pe main e stub; retry operațional = `getPendingEvents` pe `failed_retryable`

---

## 6. View `driver_job_offers_v2`

Neschimbat față de commit-ul anterior pe review: definiție live + `d.organization_id = bl.organization_id`.

---

## 7. Teste

| Suită | Rezultat |
|-------|----------|
| `dispatch-stage1.isolated.test.mjs` | Actualizat (Option A, Premium mid-wave, vehicle selectat, booking, auth, retry) |
| `concurrent-accept-semantics.test.mjs` | Actualizat (service-role fără auth ≠ concurență) |
| `staging-concurrent-accept.auth.sql` | **Nou** — 2× `auth.uid()` distincte pe staging |
| `STAGING_REAL_IMPL_PLAN.md` | A1–A12; retry B3 pe același event |
| PG real pe VL NEW | **Ne-rulat** |
| OneSignal real | **Interzis** |

Următoarea etapă: **implementare reală pe DB izolată** (staging), nu apply pe VL NEW.

---

## 8. Fișiere pe review

```
docs/dispatch-stage1/
  RAPORT_STAGE1_UPDATE.md
  migrations/
    20261112060000_dispatch_stage1_atomic_accept_and_wave_rules.sql
    20261112060100_dispatch_stage1_payment_trigger_premium_first.sql
    20261112060200_dispatch_stage1_offers_org_filter.sql
  backend-patches/
    process-driver-job-available.COMPARE_LIVE.md
    OPEN_WAVE_AND_RETRY_PATH.md
  tests/
    dispatch-stage1.isolated.test.mjs
    concurrent-accept-semantics.test.mjs
    staging-concurrent-accept.auth.sql
    STAGING_REAL_IMPL_PLAN.md
```

**Nimic aplicat pe VL NEW. Niciun deploy nou. Nicio notificare reală. Fără merge pe main.**
