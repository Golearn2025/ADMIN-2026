# Worker — verificare ofertabilitate înainte de send (inclusiv retry)

## Regulă

Înainte de orice trimitere OneSignal/Resend pentru `driver_job_available`
(prima dată sau retry pe `failed_retryable`):

```sql
SELECT public.job_leg_is_offerable(<job_id>);
-- false → marchează event cancelled / skip send; NU reîncearcă push
```

`job_leg_is_offerable` = leg `PENDING`, neasignat, neșters, booking `CONFIRMED` + plată `succeeded`.

## Cine oprește coada

| Eveniment | Efect DB (Stage1 review) |
|-----------|---------------------------|
| Accept reușit (ambele overload-uri) | `cancel_pending_job_available_notifications(leg)` → `pending/ready/failed_retryable/processing` → `cancelled` |
| Enqueue wave | Re-check `job_leg_is_offerable` înainte de fiecare insert |
| Worker retry | **Obligatoriu** același check (patch handler; fără apply pe prod acum) |

## Distincții

- Event **cancelled** ≠ delivery **failed_retryable**
- Retry pe event cancelled: worker nu trebuie să trimită
- Accept/cancel trebuie să oprească trimiterile rămase **înainte** ca retry-ul să le ridice
