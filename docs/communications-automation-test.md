# Automations — test pe `test@vantage-lane.com`

**Nu activa** regulile din Admin pentru toți șoferii până nu trece mock-ul pe userul de test.

## Target mock (SSOT)

| Field | Value |
|-------|--------|
| Email | `test@vantage-lane.com` |
| Driver ID | `1187555a-2e7a-4e06-9463-6c6ef8a9ddc9` |
| Org ID | `9a5caade-4791-4860-93b5-12b1c4fa9830` |

Backend: `Cursor-Projects/Back End Notification/backend-notifications`  
Rute: `/internal/notifications/test/*` (necesită internal auth).

## Dry-run (fără trimitere)

```bash
# Doc expiry 30 zile — preview
curl -s -X POST "$NOTIF_URL/internal/notifications/test/doc-expiry-mock" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"daysLeft":30,"dryRun":true}'

# Job reminder 3h — preview
curl -s -X POST "$NOTIF_URL/internal/notifications/test/job-reminder-mock" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"minutesBefore":180,"dryRun":true}'

# Account approved — preview
curl -s -X POST "$NOTIF_URL/internal/notifications/test/account-status-mock" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"approved","dryRun":true}'
```

## Trimite mock real (doar test@)

```bash
# Docs: inbox + push event + email Resend
curl -s -X POST "$NOTIF_URL/internal/notifications/test/doc-expiry-mock" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"daysLeft":30,"documentType":"driving_licence","sendEmail":true,"sendPush":true}'

# Job reminder: inbox + push (fără email)
curl -s -X POST "$NOTIF_URL/internal/notifications/test/job-reminder-mock" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"minutesBefore":180}'

# Cont suspendat
curl -s -X POST "$NOTIF_URL/internal/notifications/test/account-status-mock" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"suspended"}'

# Push imediat (bypass worker)
curl -s -X POST "$NOTIF_URL/internal/notifications/test/automation-push-now" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Pickup in 3 hours","message":"14:30 · Heathrow T5 → Mayfair","deepLink":"accepted"}'
```

## Ce verifici pe telefon (app pe test@)

1. **Documents** inbox — notificare doc expiry  
2. Tap push docs → ecran **Documents**  
3. Job reminder → **Updates** + tap → **Accepted** (dacă `jobId` e setat)  
4. Email Resend → inbox `test@vantage-lane.com` (doar docs)  

## Resend

Template nou de publicat: `driver_document_expiring_v1`  
`cd backend-notifications && npm run publish-resend-templates`
