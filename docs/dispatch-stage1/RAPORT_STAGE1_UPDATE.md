# Raport Stage 1 — actualizat (fără apply / deploy / notificări reale)

**Data:** 2026-11-12  
**Branch Admin local:** `2026-11-12-v1.5` @ `af06efa`  
**Artefacte corectate:** `docs/dispatch-stage1/**` (NU în `supabase/migrations` de apply)

---

## 1. Stare ACTUALĂ — dovezi (nu deducții din GitHub files)

### 1.1 Admin `af06efa` pe Render?

| Dovadă | Rezultat |
|--------|----------|
| `https://admin-2026.onrender.com` răspunde, header `x-render-origin-server: Render`, Next.js | **CONFIRMAT:** un Admin rulează pe Render |
| GitHub Deployments API `ADMIN-2026` | **0 deployments** înregistrate |
| HTML `/login` conține `af06efa` / `Job Dispatch` / `/dispatch` în bundle-urile publice | **NU** — login prerender; `main-app-*.js` fără aceste stringuri |
| Redirect `/dispatch` → `/login` (307) | Ambiguu (middleware auth, nu dovedește ruta din build) |

**Verdict:** **NECONFIRMAT** că Render rulează exact `af06efa`. Știm doar că există un deploy Next pe `admin-2026.onrender.com`. Pentru confirmare: Render Dashboard → service → Deploy history → commit SHA, sau `curl` autentificat către o rută nouă din `af06efa`.

### 1.2 Backend notificări — ce commit rulează acum?

| Dovadă | Rezultat |
|--------|----------|
| GitHub `main` HEAD | `650261135c` (redeploy empty); fix targeting în istoric: `11a34779a3` |
| Cod pe main: `handler.ts` L168–193, L249–250 targeting | **CONFIRMAT pe GitHub** |
| Livrări reale CB-001027/028/029 (22:13–22:14Z, **după** merge fix 22:05Z) | `driver_id` setat, dar **38** deliveries, `recipient_selection=eligible_drivers` → worker **încă pe comportament vechi** la acel moment |
| Evenimente `driver_job_available` după `2026-11-10 22:20:55Z` | **0 rânduri** → **NECONFIRMAT** dacă worker-ul live a trecut pe noul cod |

**Verdict:** Codul corect e pe GitHub `main`. Runtime Render worker = **neconfirmat**; ultima dovadă de livrare arată fan-out vechi.

### 1.3 Migrări Stage 1 pe VL NEW?

Interogare `supabase_migrations.schema_migrations`:

- **Prezente (Nov 10 dispatch v1):**  
  `20261110162735` rating recalc, `…164041` customer ratings, `…164143` dispatch settings, `…164724` runs/offers, `…164936` notify/accept guard, `…165549` premium release/timer, `…222003` emergency stop  
- **Absente:** `20261112060000`, `20261112060100`, `20261112060200` / orice `stage1`

**Verdict:** Stage 1 review migrations **NU sunt aplicate** pe VL NEW.  
`waves_enabled_automatic = false` (citit din `dispatch_org_settings` org Vantage Lane).

---

## 2. `driver_accept_job` — corecturi (față de propunerea anterioară)

### Overload-uri LIVE confirmate

1. `driver_accept_job(p_leg_id uuid, p_driver_id uuid DEFAULT NULL) → jsonb` **SECURITY DEFINER**  
2. `driver_accept_job(p_driver_id uuid, p_vehicle_id uuid, p_booking_leg_id uuid) → boolean`  

### Probleme CONFIRMATE (cod live)

| Bug | Dovezi |
|-----|--------|
| Alegere arbitrară `p_driver_id` | JSONB: `IF p_driver_id IS NOT NULL THEN driver_id := p_driver_id` fără verificare `auth.uid()` |
| Race non-atomic | JSONB: `UPDATE … WHERE id = p_leg_id` **fără** `assigned_driver_id IS NULL` |
| Grants prea largi | `EXECUTE` pentru `PUBLIC`, `anon`, `authenticated`, `service_role` (câte 2 = ambele overload-uri) |
| Fără org / vehicle pe JSONB | Absente din definiție |
| Boolean overload | `FOR UPDATE` ok, dar tot acceptă `p_driver_id` străin; status `'ACCEPTED'` vs `'ASSIGNED'` pe celălalt |

### Corecție (fișier)

`docs/dispatch-stage1/migrations/20261112060000_dispatch_stage1_atomic_accept_and_wave_rules.sql`

- Caller = `auth.uid()` → doar sine  
- Reject `p_driver_id` străin  
- Org match, vehicle match, wave guard  
- `UPDATE … AND assigned_driver_id IS NULL` + `GET DIAGNOSTICS`  
- `REVOKE` de pe `PUBLIC`/`anon`; `GRANT` authenticated + service_role  
- Ambele overload-uri aliniate

### Concurență

- Simulator semantic: `tests/concurrent-accept-semantics.test.mjs` → **PASS**  
- **Nu** am rulat 2 tranzacții PostgreSQL reale pe VL NEW (ar muta producția). Plan staging: `tests/STAGING_REAL_IMPL_PLAN.md` A1.

---

## 3. View `driver_job_offers_v2`

Fișierul vechi `…60200…` era doar NOTE + SELECT.  
**Înlocuit** cu `CREATE OR REPLACE VIEW` din **definiția live** (`pg_get_viewdef` 2026-11-12) +  
`AND d.organization_id = bl.organization_id` în EXISTS.

Permisiuni live pe view: `anon`/`authenticated`/`service_role` au SELECT+WRITE grants largi — **nu le-am îngustat** aici (schimbare separată de securitate).

---

## 4. Open wave — destinatari, Premium care se schimbă, duplicate, retry

### Comportament LIVE actual
- `enqueue_dispatch_wave_notifications(...,'open')` inserează **1** event cu `driver_id NULL` → worker fan-out `eligible_drivers`.
- Nu există istoric `source_module=dispatch_wave_open` în ultimele 14 zile pe VL NEW (doar payment_succeeded).

### Propunere corectată
- Open = **un event per șofer** non-Premium (snapshot lista Premium **la enqueue**).
- Skip dacă există deja `notification_events` pe același `job_id`+`driver_id` (orice wave).
- Idempotency key: `driver_job_available:wave:open:{org}:{leg}:{driver}` + `ON CONFLICT DO NOTHING`.

### Dacă Premium se schimbă între valuri
| Caz | Efect |
|-----|--------|
| Șofer adăugat pe Premium **după** Premium notify, **înainte** de Open | La Open e exclus dacă e pe listă acum → poate **nu** primește Open (ok dacă e Premium) |
| Șofer scos din Premium după ce a primit Premium push | Poate primi Open (al 2-lea push) — mitigare: skip pe orice notify anterior pe `job_id` |
| Șofer adăugat pe Premium după Open deja trimis | Nu retractăm Open deja livrat |

### Retry
- Retry = pe **`notification_deliveries`** (`failed_retryable`), **nu** re-inserare event.
- Re-procesarea aceluiași event nu trebuie să creeze al doilea idempotency key.
- Worker trebuie să rămână idempotent pe `(event_id, recipient_id, channel)`.

---

## 5. Fără Premium eligibil — OPȚIUNI (aștept decizia ta)

**Nu** am lăsat Open imediat ca regulă aprobată.  
`start_premium_dispatch_run` returnează `success:false`, `error:no_eligible_premium`, `action_required:true`.

| Opțiune | Comportament |
|---------|----------------|
| **A. `open_immediately`** | Creează wave Open + notify non-premium |
| **B. `wait_manual_open`** | Nicio wave Open; admin apasă „Open to all” |
| **C. `widen_vehicle_match`** | Reîncearcă Premium cu reguli mai late (ex. doar categorie) |
| **D. `cancel_dispatch`** | Anulează run-urile; job rămâne nepublicat la șoferi |

Alege A/B/C/D — abia apoi actualizez migrarea.

---

## 6. Patch backend vs runtime (rezumat)

| Item | Status |
|------|--------|
| Targeting pe GitHub main | **Rezolvat** (`11a34779`, linii handler 168–193, 249–250) |
| Review text pe `3291bed` | **Obsolete** |
| Runtime Render worker | **Neconfirmat** (ultima livrare = fan-out vechi) |
| DB Open per-driver + anti-duplicate | **Lipsește** (neaplicat) |
| Accept atomic + anti-impersonare | **Lipsește** (neaplicat; propunere corectată în docs) |

---

## 7. Teste

| Suită | Rezultat |
|-------|----------|
| `dispatch-stage1.isolated.test.mjs` | **12/12 PASS** (păstrat) |
| `concurrent-accept-semantics.test.mjs` | **PASS** |
| 2× tranzacții PG reale | **Ne-rulat pe VL NEW** (plan staging) |
| OneSignal real | **Interzis / nerulat** |

Plan implementare reală izolată: `tests/STAGING_REAL_IMPL_PLAN.md`.

---

## 8. Fișiere diff (review only)

```
docs/dispatch-stage1/
  RAPORT_STAGE1_UPDATE.md          ← acest raport
  migrations/
    20261112060000_dispatch_stage1_atomic_accept_and_wave_rules.sql  ← corectat
    20261112060100_dispatch_stage1_payment_trigger_premium_first.sql ← no auto-open pe fail premium
    20261112060200_dispatch_stage1_offers_org_filter.sql             ← view COMPLET din live
  backend-patches/
    process-driver-job-available.COMPARE_LIVE.md
  tests/
    dispatch-stage1.isolated.test.mjs
    concurrent-accept-semantics.test.mjs
    STAGING_REAL_IMPL_PLAN.md
```

**Nimic aplicat. Niciun deploy. Nicio notificare reală. `waves_enabled_automatic` rămâne false.**
