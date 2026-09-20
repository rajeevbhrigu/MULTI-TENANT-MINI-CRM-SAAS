# Database ER Diagram

Full schema: [`prisma/schema.prisma`](../prisma/schema.prisma) (40+ models). This diagram covers
the core relationships; billing (`Plan`/`Subscription`/`Invoice`/`Payment`), automation
(`AutomationRule`/`AutomationRun`), and AI (`AiRequestLog`) tables are omitted for readability but
follow the same `tenantId`-scoped pattern.

```mermaid
erDiagram
    Tenant ||--o{ TenantUser : "has members"
    User ||--o{ TenantUser : "belongs to workspaces"
    TenantUser }o--|| TenantRole : "role"

    Tenant ||--o{ Lead : owns
    Tenant ||--o{ Customer : owns
    Tenant ||--o{ Campaign : owns
    Tenant ||--o{ Pipeline : owns
    Tenant ||--o{ IntegrationConnection : owns
    Tenant ||--o{ AuditLog : "audited actions"

    Lead ||--o{ LeadStatusHistory : "status changes"
    Lead ||--o{ Activity : "activity timeline"
    Lead ||--o{ Note : "internal notes"
    Lead ||--o{ Followup : "follow-ups"
    Lead ||--o{ LeadPipelineStage : "stage placements"
    Lead ||--o{ Conversation : "conversations"
    Lead ||--o| Customer : "converts to (preserved)"
    Lead }o--|| LeadSource : source
    Lead }o--|| LeadStatusValue : status
    Lead }o--o| Campaign : "attributed to"
    Lead }o--o| User : "assigned to"

    Customer ||--o{ Activity : "activity timeline"
    Customer ||--o{ Conversation : "conversations"
    Customer ||--o{ Deal : deals

    Pipeline ||--o{ PipelineStage : "has stages"
    PipelineStage ||--o{ LeadPipelineStage : "lead placements"

    Campaign ||--o{ Lead : "generates"

    Conversation ||--o{ Message : "messages"
    Conversation }o--|| ConversationChannel : channel

    IntegrationConnection }o--|| IntegrationProvider : provider

    Tenant ||--o| Subscription : "has one"
    Subscription }o--|| Plan : "subscribes to"

    Tenant {
        uuid id PK
        string companyName
        string slug UK
        string timezone
        string currency
        enum status
    }
    User {
        uuid id PK
        string email UK
        string passwordHash
        bool isPlatformAdmin
    }
    TenantUser {
        uuid id PK
        uuid tenantId FK
        uuid userId FK
        enum role
        enum status
    }
    Lead {
        uuid id PK
        uuid tenantId FK
        int leadNumber
        string name
        string mobile
        string email
        enum source
        enum status
        enum priority
        uuid assignedToId FK
        uuid campaignId FK
    }
    Customer {
        uuid id PK
        uuid tenantId FK
        uuid leadId FK "nullable, preserved link"
        string name
        enum status
    }
    Activity {
        uuid id PK
        uuid tenantId FK
        uuid leadId FK
        uuid customerId FK
        enum type
        enum channel
        datetime createdAt "append-only"
    }
    Conversation {
        uuid id PK
        uuid tenantId FK
        uuid leadId FK
        enum channel
        string externalConversationId
    }
    Message {
        uuid id PK
        uuid conversationId FK
        enum direction
        string externalMessageId UK "idempotency key"
        string content
    }
    Pipeline {
        uuid id PK
        uuid tenantId FK
        string name
        bool isDefault
    }
    PipelineStage {
        uuid id PK
        uuid pipelineId FK
        string name
        enum status "maps to LeadStatusValue"
    }
    IntegrationConnection {
        uuid id PK
        uuid tenantId FK
        enum provider
        enum mode "MOCK | LIVE"
        string externalAccountId
    }
    AuditLog {
        uuid id PK
        uuid tenantId FK "nullable"
        uuid actorUserId FK
        string action
        string entityType
        datetime createdAt "immutable"
    }
```

## Notes on the model

- **`Lead.leadNumber`** is a per-tenant sequence (via the `LeadCounter` row) that gives you the
  human-readable `LEAD-000123` id, distinct from the internal UUID `id`.
- **Converting a lead never deletes it.** `Customer.leadId` links back to the originating lead;
  the lead's status moves to `CUSTOMER` but its full history, activities, notes, and conversations
  stay attached and queryable.
- **`LeadStatusHistory` and `Activity` are append-only** by convention (enforced in application
  code, not a DB trigger) — status changes and timeline entries are never overwritten or deleted
  by normal application flows.
- **`Message.externalMessageId`** carries a unique constraint per tenant, which is what makes
  webhook redelivery idempotent at the data layer, on top of the `WebhookEvent` ledger.
