# API v1 Reference

Base URL: `https://your-domain.example/api/v1`

## Authentication

Two methods, both resolved by `src/server/api-auth.ts::resolveApiContext`. The tenant is always
derived server-side from whichever credential is presented — a `tenantId` in the request body or
query string is never honored.

### 1. Session cookie (same-origin, used by the app's own UI)

Standard `minicrm_session` httpOnly cookie set at login.

### 2. API key (external integrations)

```
Authorization: Bearer mcrm_live_<random>
```

Generate one from **Settings → API Keys**. The full key is shown exactly once at creation; only a
salted SHA-256 hash is stored. A revoked key is rejected immediately. API keys act with
Admin-equivalent permissions on their owning tenant.

Rate limit: 300 requests/minute per key (429 on excess).

## Errors

Standard shape: `{ "error": "message" }` with an appropriate status code (`401` unauthenticated,
`403` forbidden/wrong tenant, `404` not found, `422` validation, `429` rate limited).

## Endpoints

### Leads

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/leads` | `leads.view` | Query params: `q, status, priority, source, assignedToId, page, pageSize, sort` |
| `POST` | `/leads` | `leads.create` | Body: `{ name, mobile?, email?, company?, source?, priority? }`. Enforces the plan's `maxLeads`. |
| `GET` | `/leads/:id` | `leads.view` | Full lead detail: activities, notes, followups, conversations, status history |
| `PATCH` | `/leads/:id` | `leads.edit` | Body: any of `name, mobile, email, company, priority, assignedToId` |
| `GET` | `/leads/export` | `leads.export` | Streams CSV of the filtered list; records an audit log entry |

### Activities

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/activities?leadId=` | `activities.view` | |
| `POST` | `/activities` | `activities.create` | Body: `{ leadId, type, channel?, subject?, description? }` |

### Customers

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/customers` | `customers.view` | Paginated |
| `POST` | `/customers` | `customers.create` | Body: `{ name, mobile?, email?, company? }` |

### Follow-ups

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/followups?status=` | `leads.view` | |
| `POST` | `/followups` | `leads.edit` | Body: `{ leadId, title, dueDate, description?, priority?, assignedToId? }` |

### Campaigns

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/campaigns` | `campaigns.view` | |
| `POST` | `/campaigns` | `campaigns.manage` | Body: `{ name, platform? }` |

### Dashboard & reports

| Method | Path | Permission | Notes |
|---|---|---|---|
| `GET` | `/dashboard?range=` | `reports.view` | `range`: `today\|yesterday\|7d\|30d\|this_month\|last_month` |
| `GET` | `/reports/export?type=` | `reports.view` | `type`: `leads\|source\|campaign\|sales\|team\|conversion\|followup\|customer` |

## Inbound webhooks

All inbound webhooks share one pipeline (`src/server/integrations/webhook-handler.ts`):

1. **Parse** the raw payload into normalized events via the provider's adapter.
2. **Verify signature** — `X-Hub-Signature-256: sha256=<hmac>` for WhatsApp/Facebook/Instagram
   (Meta convention), a bearer verification token for Gmail. The secret used is the connected
   tenant's stored credential, or the shared `*_WEBHOOK_VERIFY_TOKEN` dev secret while a
   connection is still in `MOCK` mode.
3. **Resolve tenant** from the event's `externalAccountId` (WhatsApp `phone_number_id`, Meta
   `page_id`, Gmail mailbox) against `IntegrationConnection`.
4. **Idempotency** — each normalized event is inserted into `WebhookEvent` keyed by
   `(provider, providerEventId)` before being applied; a re-delivered webhook with the same event
   id is a no-op.
5. **Apply** — `lead-intake.ts` matches-or-creates a lead, matches-or-creates the conversation,
   appends the message + an activity, and notifies the assignee.

| Method | Path | Verification |
|---|---|---|
| `GET`/`POST` | `/webhooks/whatsapp` | `GET` is the Meta subscription handshake (`hub.challenge`); `POST` is the message webhook |
| `GET`/`POST` | `/webhooks/meta` | Facebook Lead Ads + Messenger |
| `GET`/`POST` | `/webhooks/instagram` | Instagram DMs |
| `POST` | `/webhooks/gmail` | Simplified push-notification shape (see `gmail/adapter.ts` for the real Pub/Sub → Gmail API flow this stands in for) |

Never dropped silently: a failure to apply an event (e.g. the tenant's lead limit is reached) is
recorded on the `WebhookEvent.processingError` column rather than discarded, so it can be
inspected/retried.

### Example: simulate a WhatsApp message (what "Simulate Inbound" in Settings → Integrations sends)

```json
POST /api/v1/webhooks/whatsapp
X-Hub-Signature-256: sha256=<hmac-sha256 of the raw body using the connection secret>

{
  "entry": [{
    "changes": [{
      "value": {
        "metadata": { "phone_number_id": "<tenant's connected account id>" },
        "contacts": [{ "wa_id": "919990000001", "profile": { "name": "Jane Prospect" } }],
        "messages": [{
          "from": "919990000001",
          "id": "wamid.unique-id",
          "timestamp": "1710000000",
          "type": "text",
          "text": { "body": "Hi, I'm interested in your product!" }
        }]
      }
    }]
  }]
}
```

## Outbound webhooks (schema in place, UI not yet built)

The data model for tenant-configured outbound webhooks exists (`OutboundWebhook` /
`OutboundWebhookDelivery`, with `events: string[]` such as `lead.created`, `lead.converted`,
`customer.created`, and a per-webhook signing secret), ready for a settings page + dispatcher to be
built on top. That dispatcher is not implemented in this pass.
