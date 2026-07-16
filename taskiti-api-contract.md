# Taskiti API Contract

**Base URL:** `https://api.malet.app` (configurable)
**Auth:** Bearer JWT (firmado con `JWT_SECRET_TASKITI_APP`)

---

## 1. Autenticación — `/auth/taskiti`

### 1.1 Login

```
POST /auth/taskiti/login
Content-Type: application/json
X-Client-Source: taskiti

{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John",
    "email": "user@example.com",
    "avatar_url": null
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "a1b2c3d4e5f6..."
  }
}
```

**Response 401:**
```json
{
  "message": "Invalid credentials",
  "statusCode": 401
}
```

---

### 1.2 Register

```
POST /auth/taskiti/register
Content-Type: application/json
X-Client-Source: taskiti

{
  "name": "John",
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response 201:** (mismo formato que login)

**Response 409:**
```json
{
  "message": "Email already registered",
  "statusCode": 409
}
```

---

### 1.3 Refresh Token

```
POST /auth/taskiti/refresh
Content-Type: application/json
X-Client-Source: taskiti

{
  "refresh_token": "a1b2c3d4e5f6..."
}
```

**Response 200:**
```json
{
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "f6e5d4c3b2a1..."
  }
}
```

**Response 401:**
```json
{
  "message": "Invalid or expired refresh token",
  "statusCode": 401
}
```

---

### 1.4 Verify Session

```
GET /auth/taskiti/verify
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "name": "John"
  }
}
```

**Response 401:** (token expirado o inválido)

---

## 2. Tasks CRUD — `/tasks`

TODOS los endpoints requieren:

```
Authorization: Bearer <access_token>
X-Client-Source: taskiti
```

### 2.1 List Tasks (cursor-based pagination)

```
GET /tasks?include_deleted=false&since=2024-01-01T00:00:00Z&status=all&take=20&cursor=uuid
```

| Query | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `include_deleted` | boolean | `false` | Incluir tareas eliminadas |
| `since` | ISO8601 | — | Solo tareas actualizadas después de esta fecha |
| `status` | `active` \| `completed` \| `all` | `all` | Filtrar por estado |
| `take` | integer (max 100) | `20` | Cantidad de tareas por página |
| `cursor` | UUID | — | `id` de la última tarea de la página anterior |

**Flujo de paginación:**
1. Primera petición: sin `cursor`
2. Servidor responde `{ tasks: [...], next_cursor: "uuid-ultima-tarea" }`
3. Siguiente petición: `?cursor=uuid-ultima-tarea&take=20`
4. Cuando `next_cursor` es `null`, no hay más páginas

**Response 200:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Mi tarea",
      "description": "",
      "completed": false,
      "priority": "medium",
      "tags": ["trabajo"],
      "notes": "",
      "created_at": "2024-01-01T00:00:00.000Z",
      "expires_at": "2024-01-02T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "deleted_at": null,
      "version": 1
    }
  ],
  "next_cursor": "uuid"
}
```

---

### 2.2 Create Task

```
POST /tasks
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Comprar leche",
  "description": "Ir al supermercado",
  "priority": "high",
  "tags": ["compras"],
  "notes": "Recordar llevar bolsas",
  "expiry_hours": 24,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `id` | UUID v4 | Sí | — | Generado por el cliente |
| `title` | string (max 500) | Sí | — | |
| `description` | string | No | `""` | |
| `priority` | `low` \| `medium` \| `high` \| `urgent` | No | `"medium"` | |
| `tags` | string[] (max 10) | No | `[]` | Se almacenan en minúsculas |
| `notes` | string (max 2000) | No | `""` | |
| `expiry_hours` | integer (min 1) | No | `24` | Calcula `expires_at` desde `created_at` |
| `created_at` | ISO8601 | No | server now | |

**Response 201:**
```json
{
  "task": { "...task con version: 1 ..." }
}
```

---

### 2.3 Update Task

```
PATCH /tasks/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "title": "Comprar leche descremada",
  "completed": true,
  "version": 1
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `version` | integer | **Sí** | Control de conflictos |
| `title` | string | No | |
| `description` | string | No | |
| `priority` | enum | No | |
| `tags` | string[] | No | |
| `notes` | string | No | |
| `completed` | boolean | No | |
| `expiry_hours` | integer | No | Recalcula `expires_at` |

**Response 200:**
```json
{
  "task": { "...task con version incrementada ..." }
}
```

**Response 409 (conflicto):**
```json
{
  "error": "version_conflict",
  "message": "Task was modified by another device",
  "server_task": { "...la tarea actual en el servidor..." }
}
```

---

### 2.4 Delete Task

```
DELETE /tasks/550e8400-e29b-41d4-a716-446655440000
```

**Response 200:**
```json
{
  "deleted_at": "2024-01-01T12:00:00.000Z"
}
```

---

### 2.5 Sync

```
POST /tasks/sync
Content-Type: application/json

{
  "tasks": [
    {
      "id": "uuid",
      "title": "Tarea modificada offline",
      "completed": false,
      "priority": "medium",
      "tags": [],
      "notes": "",
      "expires_at": "2024-01-02T00:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z",
      "version": 2,
      "deleted_at": null
    }
  ],
  "last_sync_at": "2024-01-01T00:00:00.000Z",
  "device_id": "device-abc-123"
}
```

**Response 200:**
```json
{
  "tasks": [
    { "...tareas modificadas en el servidor desde last_sync_at..." }
  ],
  "deleted_ids": [
    "uuid-deleted-task-1",
    "uuid-deleted-task-2"
  ],
  "sync_at": "2024-01-01T12:00:00.000Z",
  "conflicts": [
    {
      "task_id": "uuid",
      "client_version": 2,
      "server_version": 3,
      "server_task": { "...la tarea actual en el servidor..." }
    }
  ]
}
```

---

## 3. Flujo de Sesión

### 3.1 Primera vez (login)

```
Cliente                          Servidor
  │                                │
  │  POST /auth/taskiti/login      │
  │  { email, password }           │
  │ ────────────────────────────> │
  │                                │── Valida credenciales
  │                                │── Genera access_token (15min)
  │                                │── Genera refresh_token (30d)
  │                                │── Guarda hash en taskiti_refresh_tokens
  │  { user, tokens }             │
  │ <──────────────────────────── │
  │                                │
  │  Almacena localmente:         │
  │  • access_token               │
  │  • refresh_token              │
  │  • user                       │
```

### 3.2 App se reabre (verify)

```
Cliente                          Servidor
  │                                │
  │  GET /auth/taskiti/verify     │
  │  Authorization: Bearer <at>   │
  │ ────────────────────────────> │
  │                                │── Verifica firma con JWT_SECRET_TASKITI_APP
  │                                │── Verifica source === "taskiti"
  │  { user }                     │
  │ <──────────────────────────── │
  │                                │
  │  Si 200: sesión válida,       │
  │  continúa normal              │
  │                                │
  │  Si 401: token expirado       │
  │  → ir a refresh (3.3)         │
```

### 3.3 Token expirado (refresh)

```
Cliente                          Servidor
  │                                │
  │  POST /auth/taskiti/refresh   │
  │  { refresh_token }            │
  │ ────────────────────────────> │
  │                                │── Busca hash en taskiti_refresh_tokens
  │                                │── Compara con bcrypt
  │                                │── Verifica expiry
  │                                │── DELETE old token row
  │                                │── Genera NUEVO access_token (15min)
  │                                │── Genera NUEVO refresh_token (30d)
  │  { tokens }                   │
  │ <──────────────────────────── │
  │                                │
  │  Si 401: refresh también      │
  │  expiró → forzar login (3.1)  │
```

### 3.4 Resumen de tiempos

| Token | Duración | Dónde se guarda |
|-------|----------|-----------------|
| `access_token` | 15 minutos | Memoria / SecureStorage del cliente |
| `refresh_token` | 30 días | SecureStorage del cliente + hash bcrypt en `taskiti_refresh_tokens` |

### 3.5 Estrategia de manejo de errores HTTP

| Código | Significado | Acción del cliente |
|--------|-------------|-------------------|
| `200` | OK | Procesar respuesta |
| `201` | Creado | Procesar respuesta |
| `401` | No autorizado | Intentar refresh; si falla → login |
| `403` | Prohibido | No debería pasar si el token es válido |
| `404` | No encontrado | Re-sincronizar desde servidor |
| `409` | Conflicto de versión | Mostrar al usuario la tarea del servidor |
| `429` | Rate limit | Esperar y reintentar con backoff |
| `5xx` | Error servidor | Reintentar después con backoff exponencial |

### 3.6 Headers obligatorios

| Header | Dónde | Valor |
|--------|-------|-------|
| `Content-Type` | POST/PATCH | `application/json` |
| `Authorization` | Todos menos login/register | `Bearer <access_token>` |
| `X-Client-Source` | **Todos** | `taskiti` |
