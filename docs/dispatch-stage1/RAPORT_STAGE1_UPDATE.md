# Raport Stage 1 — actualizat (fără apply / deploy / notificări reale)

**Data:** 2026-11-13 (revizie review)  
**Branch review:** `review/dispatch-stage1-corrections-2026-11-12`  
**Artefacte:** `docs/dispatch-stage1/**` (NU în `supabase/migrations` de apply)

---

## 1. Deploy-uri Render / live

| Serviciu | GitHub `main` | Live |
|----------|---------------|------|
| Admin | `af06efa` | confirmat `af06efa` |
| Backend notificări | `6502611` (fix targeting `11a34779`) | confirmat `6502611` |
| Driver | `4986126` | `4986126` |

Stage1 **neaplicat** pe VL NEW. `waves_enabled_automatic=false`. Fără deploy nou din acest run.

---

## 2. Autorizare dispatch (fix SECURITY DEFINER)

**Bug anterior:** `dispatch_caller_is_backend()` folosea `current_user IN ('postgres',…)`. În interiorul unui `SECURITY DEFINER`, `current_user` devine owner-ul funcției → orice caller părea „backend”.

**Corecție:**
- Backend = JWT `service_role` **sau** (fără JWT + `session_user` ∈ `{postgres,supabase_admin}`) — **niciodată** `current_user`
- Human = `has_org_role(org, {owner,admin,operator})` sau super-admin
- Refuzat: șoferi, `member`, admin din altă org

Testat în PGlite izolat (vezi §8).

---

## 3. Eligibilitate vehicul — aliniere Jobs / notify / Accept

| Strat | Regulă |
|-------|--------|
| Model/categorie | mașina e din clasa cerută de leg |
| `can_receive_jobs` | activ + an valid + docs approved (view `driver_app_vehicle`) |

**Diferență:** model/categorie ≠ drept de lucru. Ambele sunt obligatorii.

Aliniat în:
- `driver_vehicle_matches_leg` (acum cere `can_receive_jobs`)
- `driver_selected_vehicle_matches_leg` (mașina selectată)
- `driver_job_offers_v2` EXISTS (Jobs list)
- enqueue Premium/Open

---

## 4. Disponibilitate înainte de notify + retry

- `job_leg_is_offerable(leg)` — PENDING, neasignat, booking ready
- Enqueue re-check înainte de fiecare insert
- Accept → `cancel_pending_job_available_notifications` (`pending/ready/failed_retryable/processing` → `cancelled`)
- Worker: vezi `backend-patches/WORKER_OFFERABILITY_GUARD.md` (skip send dacă nu e offerable)
- Direct fără `exclusive_driver_id` → **zero** notify (fără fan-out)

---

## 5. Opțiunea A / Open / Direct

Neschimbat ca business: empty Premium → Open imediat; Direct exclusiv; Open pentru ne-notificați (inclusiv Premium adăugat mid-wave).

---

## 6–7. Fișiere + teste unitare

```
docs/dispatch-stage1/migrations/20261112060000_…sql   ← auth + vehicle + cancel
docs/dispatch-stage1/migrations/20261112060100_…sql   ← Direct exclusivity fail-safe
docs/dispatch-stage1/migrations/20261112060200_…sql   ← Jobs + can_receive_jobs
docs/dispatch-stage1/backend-patches/WORKER_OFFERABILITY_GUARD.md
docs/dispatch-stage1/tests/iso-db/run-isolated-real.mjs
```

Unit: `dispatch-stage1.isolated.test.mjs` **18/18**, `concurrent-accept-semantics` **PASS**.

---

## 8. Execuție DB izolată (PGlite) — 2026-11-13

Mediu: Postgres WASM local, provider fals, conturi fictive. **Nu** VL NEW. **Nu** OneSignal.

| # | Scenariu | Rezultat |
|---|----------|----------|
| 1 | Șofer → `start_premium` denied (fără escalate DEFINER) | **PASS** |
| 2 | `member` fără admin/operator denied | **PASS** |
| 3 | Admin altă org denied | **PASS** |
| 4 | Operator org allowed | **PASS** |
| 5 | Advance denied pentru driver JWT | **PASS** |
| 6 | `can_receive_jobs=false` exclus din match | **PASS** |
| 7 | Accept `vehicle_id` respinge mașină neeligibilă | **PASS** |
| 8 | Admin New Job Direct + plată → 1 notify | **PASS** |
| 9 | Eșec salvare exclusivitate Direct → 0 notify | **PASS** |
| 10 | Premium → doar premium eligibil | **PASS** |
| 11 | Open după expiry → ne-notificați | **PASS** |
| 12 | Empty Premium → Open imediat | **PASS** |
| 13 | Accept simultan 2 auth → 1 câștigător | **PASS** |
| 14 | Accept anulează pending/retry; retry skip | **PASS** |

**Skipped (nerulat):**
- Cursă FOR UPDATE pe 2 conexiuni Postgres reale (PGlite single-conn)
- Supabase branch full schema (necesită confirmare cost plătită)
- Admin UI HTTP pe Render (fără staging URL / fără deploy)

**failed = 0**

Comandă: `node docs/dispatch-stage1/tests/iso-db/run-isolated-real.mjs`

---

**Nimic aplicat pe VL NEW. Niciun merge pe main. Niciun deploy. Nicio notificare reală.**
