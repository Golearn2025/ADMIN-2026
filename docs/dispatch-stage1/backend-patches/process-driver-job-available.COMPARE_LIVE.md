# Backend push — comparație cu ce e pe GitHub `main` acum (nu 3291bed)

**Repo:** `Golearn2025/Back-End-Notification-OneSignal-Resend-2026`  
**GitHub `main` HEAD (2026-11-12 probe):** `650261135c` — empty redeploy commit  
**Fix real pe main:** `11a34779a3` — `fix(push): target Direct/Premium job alerts to intended drivers only`  
**Fișier:** `src/modules/notifications/handlers/process-driver-job-available.handler.ts`

## Ce e deja rezolvat pe main (cod)

| Comportament | Unde (linii pe main raw) |
|---|---|
| Citește `event.driver_id` / `payload.exclusive_driver_id` | `handler.ts` L168–172 (`targetedDriverId`, `isTargetedDispatch`) |
| Direct/țintă → `resolveDriversByIds` (un singur șofer) | L176–181 |
| Open fără driver_id → `resolveEligibleDrivers` (broadcast eligibili) | L183–187 |
| Safety: `dispatch_wave === 'premium'` fără driver_id → filtrează lista Premium | L189–193 + `driver-eligibility.service.ts` L92+ `resolvePremiumDriverIds` |
| Delivery metadata `assigned_driver` când targeted | L249–250 |

## Ce lipsește încă față de Stage 1 țintă

1. **Dovadă runtime pe Render** că worker-ul rulează `11a34779` / `6502611`  
   - Ultima dovadă livrări reale (CB-001027..029 @ 2026-11-10 22:13–22:14Z): `recipient_selection=eligible_drivers`, **38** recipients, deși `driver_id` era setat.  
   - **0** evenimente `driver_job_available` după `2026-11-10 22:20:55Z` (momentul redeploy push) → **nu putem confirma** că worker-ul live e pe noul cod.
2. **Open wave anti–2nd-push Premium** pe handler: pe main, Open legacy cu `driver_id NULL` încă face fan-out la toți eligibilii pe vehicul. Mitigarea Stage1 e pe **DB** (events per-driver + skip deja notificați) — încă **neaplicată**.
3. **Mock OneSignal + staging worker** — netestat pe mediu izolat.
4. Patch-ul vechi din review (`3291bed` + 4 linii filter) e **obsolete** ca text; ținta e main curent.

## NU face acum

- Nu deploy Render din acest raport  
- Nu procesa queue producție pentru teste
