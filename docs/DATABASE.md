# JARVIS — Database & Persistence Model

## 1. Database Architecture Strategy

JARVIS utilizes a **Hybrid Storage Strategy** designed for simplicity, performance, and strong data integrity:

1. **Primary Relational Store**: **PostgreSQL** (production) / **SQLite** via **Prisma ORM** (development/local). Manages users, devices, permissions, conversations, task states, automation rules, and audit logs.
2. **Vector Index Store**: **PGVector** extension (or Qdrant / LanceDB) for project embeddings, document RAG, and memory similarity search.
3. **Session & In-Memory Cache**: **Redis** (or in-memory cache) for WebSocket state, active task locks, rate limiting, and short-term message buffers.

---

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ DEVICES : owns
    USERS ||--o{ CONVERSATIONS : initiates
    USERS ||--o{ AUTOMATIONS : configures
    USERS ||--o{ PERMISSIONS : grants
    CONVERSATIONS ||--o{ MESSAGES : contains
    CONVERSATIONS ||--o{ TASKS : spawns
    TASKS ||--o{ TOOL_EXECUTIONS : records
    TASKS ||--o{ AUDIT_LOGS : generates
    USERS ||--o{ MEMORIES : retains

    USERS {
        uuid id PK
        string email
        string password_hash
        timestamp created_at
    }

    DEVICES {
        uuid id PK
        uuid user_id FK
        string device_name
        string public_key
        timestamp last_seen
    }

    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        string title
        timestamp created_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        string sender
        text content
        timestamp timestamp
    }

    TASKS {
        uuid id PK
        uuid conversation_id FK
        string status
        string assigned_agent
        timestamp started_at
        timestamp ended_at
    }

    TOOL_EXECUTIONS {
        uuid id PK
        uuid task_id FK
        string tool_name
        jsonb arguments
        jsonb result
        string status
    }

    PERMISSIONS {
        uuid id PK
        uuid user_id FK
        string capability
        string risk_level
        boolean is_granted
    }

    MEMORIES {
        uuid id PK
        uuid user_id FK
        string tier
        text content
        vector embedding
        timestamp created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid task_id FK
        string action
        string status
        timestamp timestamp
    }
```

---

## 3. Core Database Tables & Schemas

### 3.1 `users` Table
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `password_hash` (String, Encrypted)
- `created_at` (Timestamp)

### 3.2 `devices` Table (Paired Local Agents & Browsers)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`)
- `device_name` (String, e.g. "Workstation-Win11")
- `public_key` (Text, WebAuthn / HMAC Key)
- `is_trusted` (Boolean, Default: false)
- `last_seen` (Timestamp)

### 3.3 `tool_executions` Table
- `id` (UUID, Primary Key)
- `task_id` (UUID, Foreign Key -> `tasks.id`)
- `tool_name` (String)
- `arguments` (JSONB)
- `result` (JSONB)
- `execution_time_ms` (Integer)
- `status` (Enum: 'SUCCESS', 'FAILED', 'CANCELLED', 'DENIED')

### 3.4 `memories` Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `users.id`)
- `tier` (Enum: 'SHORT_TERM', 'LONG_TERM', 'PROJECT', 'EPISODIC', 'PREFERENCE')
- `content` (Text)
- `metadata` (JSONB)
- `embedding` (Vector(1536) / PGVector)
- `created_at` (Timestamp)
