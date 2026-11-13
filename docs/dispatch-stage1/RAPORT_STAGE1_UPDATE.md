# Raport Stage 1 — review testing (fără producție)

**Data:** 2026-11-13  
**Admin review:** `review/dispatch-stage1-corrections-2026-11-12`  
**Backend review:** `review/dispatch-offerability-guard` (din `origin/main` @ `6502611`)

---

## Scope (clarificare — obligatoriu)

**Neschimbat (regresie / flux existent de comandă):**
```
plată succeeded → booking CONFIRMED → leg PENDING → Accept → ASSIGNED
→ statusurile ulterioare existente (nemodificate)
```

**Schimbarea Stage1 = doar distribuirea leg-ului PENDING:**
- cine îl vede (view / wave Direct|Premium|Open);
- cine primește notificarea și când;
- Admin: Open / Direct / Premium → după ~10 min Open dacă încă neacceptat;
- Website + Admin respectă configurația de distribuire;
- condiția existentă de **plată reușită** rămâne obligatorie pentru ofertă/notify;
- cardul Driver = aceeași ofertă (`driver_job_offers_v2`) + același Accept.

**Testele de plată / Accept / statusuri** demonstrează că fluxul de mai sus
continuă să funcționeze — nu sunt schimbări de business pe ciclul de viață.

**Interzis în Stage1:** extinderi la alte reguli de business, noi statusuri,
schimbări de billing/Stripe, redesign Accept post-ASSIGNED.

---

## A. Implementare reală — executat

### A1. Migrări 600/601/602 încărcate din fișiere (Postgres local izolat :55432)

Harness: `docs/dispatch-stage1/tests/iso-db/run-with-real-migrations.mjs`  
Bootstrap: `bootstrap-schema.sql` + **exact** SQL din `migrations/20261112*.sql` (fără rescriere a corpurilor Stage1).

| Test | Rezultat |
|------|----------|
| 600 loaded + GRANT/REVOKE (enqueue: anon/auth false, service_role true) | **PASS** |
| 602 view + `can_receive_jobs` + org filter | **PASS** |
| Auth deny driver/member/other-org pe `start_premium` | **PASS** |
| waves OFF = flux general (broadcast legacy, fără Premium auto) | **PASS** |
| waves ON = Premium → Open via `advance` | **PASS** |
| Admin Open (Option A) independent de waves website | **PASS** |
| Admin Direct exclusiv (Accept) | **PASS** |
| Driver card (`driver_job_offers_v2`) + Accept `vehicle_id` | **PASS** |
| Direct fără exclusive → 0 notify | **PASS** |
| **2 conexiuni PG + 2 auth.uid()** → 1 câștigător | **PASS** |

**SUMMARY:** passed=10 failed=0 skipped=0

### A2. Backend handler offerability (review branch, provider fals)

Cod: `job_leg_is_offerable` RPC înainte de send; `markEventCancelled`; skip pe `cancelled`.

Vitest: `process-driver-job-available.offerability.test.ts` + targeting  
**PASS** (retry / accepted / cancelled / processing / send OK)

### A3. mark-paid Direct fail fără `job_dispatch_run`

Gate în `app/api/admin/jobs/mark-paid/route.ts`: eșec lock sau lipsă exclusive → **fără** payment/confirm/broadcast; booking rămâne pe statusul anterior.  
Test: `docs/dispatch-stage1/tests/mark-paid-direct-fail.test.mjs` → **PASS**

---

## B. Simulări (nu DB migrări live / nu HTTP Admin)

| Suită | Rezultat |
|-------|----------|
| `dispatch-stage1.isolated.test.mjs` | 18/18 (simulator) |
| `concurrent-accept-semantics.test.mjs` | PASS |
| `run-isolated-real.mjs` (PGlite cu funcții copiate) | **înlocuit** de A1 — nu mai e sursa de adevăr |

---

## C. Nerulat

| Caz | Motiv |
|-----|-------|
| Apply Stage1 pe VL NEW / staging Supabase branch | Interzis / cost branch neconfirmat |
| Deploy Render Admin sau worker | Interzis |
| OneSignal/Resend reale | Interzis |
| HTTP end-to-end New Job pe Admin live | Fără staging Admin URL |
| Driver app UI nativă (card ecran) | Verificat view+Accept SQL; UI mobil nerulat |
| Merge pe `main` (Admin sau Backend) | Interzis |

---

## D. Fișiere cheie

```
ADMIN docs/dispatch-stage1/tests/iso-db/{bootstrap-schema.sql,run-with-real-migrations.mjs}
ADMIN app/api/admin/jobs/mark-paid/route.ts  ← abort payment dacă Direct fără exclusive
Backend review/dispatch-offerability-guard
  handler + repository + offerability.test.ts
```

**Nimic aplicat pe VL NEW. Niciun deploy. Nicio notificare reală.**
