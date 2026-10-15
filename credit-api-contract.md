# Contrato API — Cuentas por Cobrar / por Pagar (`CreditModule`)

Módulo `src/context/credit`. Todas las rutas requieren header `Authorization: Bearer <JWT>` y son **personales** (registros propios del usuario, ajenos a tiendas y al `wallet` normal de Malet).

Reglas generales:

- **Tipos**: `receivable` (alguien me debe → **cobrar**) y `payable` (yo debo → **pagar**).
- **Estados**: `pending` y `settled` (pagada/cobrada). Solo esos dos; se cambian con los endpoints de liquidación, nunca en el body de creación/edición.
- **Registro aparte**: cada cuenta vive en `credit_entries` y **nunca** crea transacciones en el `wallet` por sí sola. La única forma de mover dinero en una cuenta normal es liquidar con una cuenta asignada.
- **Cuenta asignada (opcional)**: `account_id` puede ser `null` (cuenta anónima) o apuntar a una cuenta propia de Malet. Se valida pertenencia (`404` si no existe/borrada, `403` si es de otro usuario). Se puede cambiar/desasignar mientras la cuenta esté `pending`.
- **Vencimiento obligatorio**: `due_date` (`YYYY-MM-DD`) es lo que ubica el registro en el calendario.
- **Liquidación completa**: no hay abonos parciales. Al liquidar con cuenta asignada se crea **una** transacción en la cuenta:
  - `receivable` → tipo `saving` (**+**, dinero que entra).
  - `payable` → tipo `expense` (**−**, dinero que sale).
  - Nombre de la transacción: `Cobro: <concepto>` / `Pago: <concepto>`. El balance lo actualiza el propio `wallet` (invariante intacta).
- **Deshacer** (`/unsettle`): soft-delete de la transacción creada (el `wallet` revierte el balance) y la cuenta vuelve a `pending`.
- **Cuentas liquidadas están selladas**: editar, soft-delete y hard-delete responden `409` con el mensaje de desliquidar primero.
- **Listado general**: `{ "data": [...], "nextCursor": "<id> | null" }` con `?take=10&cursor=<id>` (orden por `due_date` ascendente).

---

## 1. CRUD

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/credit` | `{ "type", "concept", "amount", "due_date", "party"?, "account_id"?, "notes"?, "amount" > 0 }`. |
| `GET` | `/credit?type&status&account_id&take&cursor` | Listado general paginado (pendientes primero por vencimiento). |
| `GET` | `/credit/:id` | Detalle. |
| `PUT` | `/credit/:id` | Edita campos parciales. `account_id: null` desasigna. `409` si está liquidada. |
| `DELETE` | `/credit/:id` | Soft-delete. `409` si está liquidada (desliquidar primero). |
| `PUT` | `/credit/:id/restore` | Restaura (solo existían borradas estando pendientes). |
| `DELETE` | `/credit/:id/hard` | Borrado definitivo; solo el dueño del registro (`user_id`). `409` si está liquidada. |

## 2. Liquidación (pagar / cobrar)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/credit/:id/settle` | Marca `settled` (`settled_at = ahora`). Si hay cuenta asignada, crea la transacción en ella (`saving`/`expense`). `409` si ya estaba liquidada. |
| `POST` | `/credit/:id/unsettle` | Vuelve a `pending`: soft-deletea la transacción creada (balance revertido) y limpia `settled_transaction_*`. `409` si no estaba liquidada. |

## 3. Calendario mensual

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/credit/calendar?year&month&type&status&account_id` | Vista del mes por `due_date`. `year`/`month` por defecto = mes actual (`year` 2000–2100, `month` 1–12; fuera de rango → `400`). |

Respuesta:

```json
{
  "year": 2026,
  "month": 9,
  "summary": {
    "receivable": { "pending_count": 2, "pending_amount": 150.5, "settled_count": 1, "settled_amount": 80 },
    "payable":    { "pending_count": 1, "pending_amount": 40,    "settled_count": 0, "settled_amount": 0 }
  },
  "data": [ { "id": "…", "type": "receivable", "concept": "…", "amount": 150.5, "due_date": "2026-09-15T00:00:00.000Z", "status": "pending", "account_id": null, "party": null, "settled_at": null, "settled_transaction_id": null, "notes": null, "created_at": "…", "updated_at": "…" } ]
}
```

- `data` ordenado por `due_date` ascendente (solo registros del mes y no borrados).
- `due_date` se guarda como fecha pura (medianoche UTC): para posicionar en el calendario usar los primeros 10 caracteres (`"2026-09-15"`).
- Los totales del `summary` salen de los mismos registros de `data` (respeta los filtros `type`/`status`/`account_id`).

## 4. Errores

Formato global: `{ "statusCode": <n>, "message": "<texto>" }`.

| Código | Cuándo |
|---|---|
| `400` | Validación de body/query (`amount <= 0`, `type`/`status` inválidos, `due_date` mal formado, `year`/`month` fuera de rango). |
| `401` | Sin JWT. |
| `403` | `account_id` de otro usuario; hard-delete de registro ajeno. |
| `404` | Registro inexistente/borrado, o cuenta asignada inexistente/borrada. |
| `409` | Editar/borrar estando `settled`; `settle` ya liquidada; `unsettle` no liquidada. |

---

## Esquema (Prisma `credit_entries`)

```prisma
model credit_entries {
  id                        String    @id
  user_id                   String    // dueño
  type                      String    // receivable | payable
  concept                   String
  party                     String?   // quién debe / a quién se le paga
  amount                    Decimal(12,2)
  due_date                  Date      // vencimiento (obligatorio, calendario)
  account_id                String?   // cuenta Malet asignada (opcional) → SetNull
  status                    String    // pending | settled
  settled_at                DateTime?
  settled_transaction_id    String?   // transacción wallet creada al liquidar
  settled_transaction_index String?   // index_id de esa transacción (borrar/revertir)
  notes                     String?
  created_at / updated_at / deleted_at
}
```
