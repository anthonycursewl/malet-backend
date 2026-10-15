# Contrato API — Cuaderno de Ventas (`SalesModule`)

Módulo `src/context/sales`. Todas las rutas requieren header `Authorization: Bearer <JWT>`.

Reglas generales:

- **Membresía**: cualquier miembro activo de la tienda puede leer, crear, editar y **soft-deletear** (`deleted_at`) cualquier registro de esa tienda.
- **Hard-delete** (`DELETE /:id/hard`): solo el **dueño del registro** (`created_by`, o `user_id` en la tienda). Si no eres el dueño responde `403`.
- **Listados**: respuestas `{ "data": [...], "nextCursor": "<id> | null" }` con `?take=10&cursor=<id>` (cursor sobre `created_at`/`sold_at` descendente).

---

## 1. Tiendas

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/stores` | Crea la tienda. Body: `{ "name", "currency" }`. El creador queda como dueño **y** como miembro. |
| `GET` | `/stores?take&cursor` | Tiendas donde soy miembro activo. |
| `GET` | `/stores/:id` | Detalle + `member_count` (solo miembros). |
| `PUT` | `/stores/:id` | Actualiza `{ "name"?, "currency"? }` (cualquier miembro). |
| `DELETE` | `/stores/:id` | Soft-delete (cualquier miembro). |
| `PUT` | `/stores/:id/restore` | Restaura (cualquier miembro activo). |
| `DELETE` | `/stores/:id/hard` | **Borrado definitivo**: solo el dueño. Elimina en cascada miembros, productos, métodos de pago y ventas. |

### Moneda de la tienda

- `currency` es **obligatoria** al crear y solo admite los códigos literales **`Bs`**, **`USD`** o **`COP`** (`400` en caso contrario; no se acepta `VES`).
- **Todos los montos de la tienda** —costo/PVP de productos, `unit_price`/`unit_cost` de ventas y los importes de `/summary` y `/series`— se expresan en esta moneda. Los reportes **no convierten monedas**.
- Se puede cambiar con `PUT /stores/:id`, **solo si la tienda no tiene ventas**: si existe al menos una venta activa responde `409`.
- Las tiendas existentes quedaron con `Bs` por defecto.

### Miembros

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/stores/:store_id/members` | Miembros activos. |
| `POST` | `/stores/:store_id/members` | Body: `{ "user_id" }`. Si el usuario ya fue removido (soft), lo **restaura**. `404` si el usuario no existe, `409` si ya es miembro. |
| `DELETE` | `/stores/:store_id/members/:id` | Soft-delete (cualquier miembro). No se puede remover al dueño (`403`). |
| `PUT` | `/stores/:store_id/members/:id/restore` | Restaura membresía. |
| `DELETE` | `/stores/:store_id/members/:id/hard` | **Borrado definitivo**: solo quien agregó al miembro. |

## 2. Productos

Ruta base: `/stores/:store_id/products`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/` | `{ "name", "cost", "pvp" }` (decimales, `>= 0`). |
| `GET` | `/` | `?take&cursor`. |
| `GET` | `/:id` | Detalle. |
| `PUT` | `/:id` | `{ "name"?, "cost"?, "pvp"? }`. |
| `DELETE` | `/:id` | Soft-delete. |
| `PUT` | `/:id/restore` | Restaura. |
| `DELETE` | `/:id/hard` | Solo el creador; `409` si el producto tiene ventas registradas (integridad FK). |

## 3. Métodos de pago

Ruta base: `/stores/:store_id/payment-methods`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/` | `{ "name" }`. Creado **activo** por defecto. |
| `GET` | `/` | `{ "data": [...] }` (incluye los inactivos). |
| `GET` | `/:id` | Detalle. |
| `PUT` | `/:id` | `{ "name"?, "active"? }` → **activar/desactivar**. |
| `DELETE` | `/:id` | Soft-delete (la integridad con las ventas se mantiene: las ventas lo siguen referenciando). |
| `PUT` | `/:id/restore` | Restaura. |
| `DELETE` | `/:id/hard` | Solo el creador; `409` si existen ventas que lo referencian (FK `ON DELETE NO ACTION`). |

## 4. Ventas

Ruta base: `/stores/:store_id/sales`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/` | `{ "product_id", "payment_method_id"?, "quantity"?, "unit_price"?, "unit_cost"?, "reference_currency"?, "reference_amount"?, "sold_at"? }`. |
| `GET` | `/` | Listado + filtros (ver abajo). `?take&cursor`. |
| `GET` | `/:id` | Detalle. |
| `PUT` | `/:id` | Actualiza cualquier campo (`payment_method_id: null` desasigna; `reference_currency/amount: null` limpian la referencia). |
| `DELETE` | `/:id` | Soft-delete. |
| `PUT` | `/:id/restore` | Restaura. |
| `DELETE` | `/:id/hard` | Solo el creador de la venta. |

Comportamiento del `POST`:

- `quantity` por defecto `1`.
- `unit_price` por defecto el **PVP** del producto; `unit_cost` por defecto el **costo** del producto (snapshot al momento de la venta: cambios posteriores del producto no alteran ventas ya registradas).
- `sold_at` por defecto `ahora`.
- Validaciones: producto debe pertenecer a la tienda y no estar borrado (`404`); método de pago debe pertenecer a la tienda, estar activo (`409` si está desactivado) y no estar borrado (`404`).
- La respuesta incluye los campos calculados `total` (`unit_price * quantity`) y `profit` (`(unit_price - unit_cost) * quantity`).

### Referencia en otra moneda (solo informativa)

- `reference_currency` (`Bs` | `USD` | `COP`) + `reference_amount` (`>= 0`) anotan el importe en otra moneda por referencia —por ejemplo, registrar una venta en Bs y apuntar su equivalente en USD—. **La moneda base de la venta y de la tienda no cambia.**
- Son **obligatoriamente un par**: deben enviarse juntos; `400` si llega solo uno, o si uno es `null` y el otro con valor. En `PUT`, ambos en `null` **limpian** la referencia; omitir ambos no modifica nada.
- **Nunca participan en cálculos ni reportes**: `total`, `profit`, `summary`, `series` y cualquier total siguen expresados en la moneda de la tienda.
- Aparecen en el detalle y listado de ventas como `reference_currency` y `reference_amount` (`null` cuando no hay referencia).

### Filtros de listado y reportes (`GET /sales`, `/summary`, `/series`)

| Param | Descripción |
|---|---|
| `payment_method_id` | Filtra por método de pago. |
| `product_id` | Filtra por producto. |
| `preset` | Rango común: `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `last_7_days`, `last_30_days`, `this_year`. |
| `from`, `to` | Rango personalizado ISO. Un `to` date-only (`YYYY-MM-DD`) **incluye todo el día**. Si no hay `preset` ni rango: sin filtro de fechas. |

### Reportes pre-computados

#### `GET /stores/:store_id/sales/summary?...mismos filtros...`

Agregados del rango (por defecto **todo el tiempo** si no hay filtros de fecha):

```json
{
  "sales_count": 42,
  "units_sold": 120,
  "revenue": 5400.00,
  "cost": 3120.00,
  "profit": 2280.00,
  "average_ticket": 128.57,
  "range": { "from": "2026-09-01T00:00:00.000Z", "to": "2026-09-23T12:00:00.000Z" }
}
```

#### `GET /stores/:store_id/sales/series?period=day|week|month&...mismos filtros...`

Series por bucket (`date_trunc`). Por defecto `period=day` y **últimos 30 días** si no hay rango:

```json
{
  "period": "day",
  "from": "2026-08-25T04:00:00.000Z",
  "to": "2026-09-23T12:00:00.000Z",
  "data": [
    { "bucket": "2026-09-22T04:00:00.000Z", "sales_count": 5, "units_sold": 9, "revenue": 450, "cost": 260, "profit": 190 }
  ]
}
```

Los reportes excluyen ventas con soft-delete y aceptan los mismos filtros `payment_method_id` / `product_id`.

---

## 5. Invitaciones por QR (tipo WhatsApp Web)

Flujo: el **dueño** genera un QR con un token de vida corta → la otra persona lo escanea en la app → pantalla de consentimiento ("X te invita a su tienda") → **Aceptar** o **Rechazar**.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/stores/:store_id/invites` | Genera/rota el QR. **Solo el dueño** (`403` otherwise). Devuelve el token nuevo y **revoca los anteriores** (solo el QR más reciente sirve). |
| `DELETE` | `/stores/:store_id/invites` | Revoca el QR actual sin generar uno nuevo. Solo el dueño. |
| `GET` | `/store-invites/:token` | Datos de la pantalla de consentimiento (quién invita y a qué tienda). Requiere login. |
| `POST` | `/store-invites/:token/accept` | Acepta la invitación: entra como miembro y **consume el token** (uso único). Requiere login. |

Rechazar es solo decisión del cliente: no se llama a ningún endpoint, el token simplemente expira (o el dueño lo revoca).

### Generar el QR

```json
POST /stores/<store_id>/invites
{
  "token": "Xk3...43 caracteres base64url...",
  "qr_payload": "malet:store-invite:Xk3...",
  "expires_at": "2026-09-23T12:00:59.000Z"
}
```

- **TTL: 60 segundos** (`STORE_INVITE_TTL_MS` en `domain/constants.ts`).
- **Rotación**: el cliente debe volver a llamar `POST .../invites` cada ~45-60 s y redibujar el QR → "va cambiando poco a poco" como WhatsApp Web.
- El QR codifica `qr_payload` (prefijo `malet:store-invite:` para que la app detecte el tipo al escanear; el endpoint también acepta el token pelado).
- Seguridad: en DB **solo se guarda el hash SHA-256** del token; el token crudo solo viaja en la respuesta/QR. Cada rotación invalida los códigos anteriores.

### Escanear (consentimiento)

```json
GET /store-invites/<token>
{
  "store": { "id": "...", "name": "Panadería" },
  "inviter": { "id": "...", "name": "Diego", "avatar_url": null },
  "expires_at": "2026-09-23T12:00:59.000Z"
}
```

### Aceptar

```json
POST /store-invites/<token>/accept
→ 201 { "id": "...", "store_id": "...", "user_id": "<scanner>", "created_by": "<owner>", ... }
```

- Token **de uso único**: la reclama de forma atómica antes de unir.
- Si el usuario ya era miembro activo → `409` y el token se **libera** (no se consume) para poder reintentar.
- Si la tienda ya no existe → `404` y también libera el token.

---

## Errores

Formato global: `{ "statusCode": 403, "message": "..." }`

| Código | Cuándo |
|---|---|
| `400` | Par de referencia incompleto en una venta (`reference_currency`/`reference_amount`), o valores inválidos (moneda fuera de `Bs`/`USD`/`COP`, montos negativos, etc.). |
| `403` | No eres miembro de la tienda, o no eres el dueño del registro para hard-delete, o intentas remover al dueño de la tienda, o no eres el dueño para generar invitaciones. |
| `404` | Tienda/producto/método/venta inexistente o soft-deleteado, recurso de otra tienda, usuario inexistente, o token de invitación desconocido/malformado. |
| `409` | Usuario ya es miembro; método de pago desactivado; hard-delete de producto/método con ventas que lo referencian; **cambio de moneda de una tienda que ya tiene ventas**. |
| `410` | Token de invitación **expirado, ya usado o revocado** (el cliente debe escanear un QR nuevo). |
