# Contrato API — Módulo Gimnasio (`GymModule`)

Módulo **opcional (opt-in)**: `src/context/gym`. La activación genérica vive en `src/context/modules` (tabla `user_modules`).

Todas las rutas requieren `Authorization: Bearer <JWT>`.

Reglas generales:

- **Módulo activado**: si el usuario no activó `gym`, **toda** ruta `/gym/*` responde `403`. Al desactivarlo **no se borra nada**: los datos quedan guardados y vuelven a estar disponibles al reactivar.
- **Ámbito**: el gimnasio es **por usuario** (`user_id`); nunca se comparten rutinas ni sesiones entre usuarios.
- **Listados**: respuestas `{ "data": [...], "nextCursor": "<id> | null" }` con `?take=10&cursor=<id>`.
- **Borrado lógico**: `deleted_at` + `PUT /:id/restore`. El borrado definitivo (`DELETE /:id/hard`) respeta las reglas de integridad de cada recurso.
- **Días de la semana**: `1 = lunes … 7 = domingo` (ISO).

---

## 0. Activación del módulo

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/modules` | Módulos opcionales con su estado para el usuario. La app **oculta los desactivados**. |
| `PUT` | `/modules/:key` | `{ "enabled": true \| false }`. Activa o desactiva un módulo. |

```json
GET /modules
[
  {
    "key": "gym",
    "name": "Gimnasio",
    "description": "Rutina semanal (lunes a domingo) y registro de entrenamientos con métricas de progreso.",
    "opt_in": true,
    "enabled": false,
    "enabled_at": null
  }
]
```

- `enabled_at` guarda el momento de la última activación.
- Reactivar un módulo **no** crea ni borra datos: solo vuelve a habilitar el acceso.
- `404` si la clave de módulo no existe.

---

## 1. Ejercicios (catálogo base + personalizados)

Ruta base: `/gym/exercises`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/` | `{ "name", "muscle_group", "equipment"?, "type"? }`. Crea un ejercicio **personal**. |
| `GET` | `/` | Catálogo base (`user_id = null`) **+** los ejercicios propios. Filtros: `search` (nombre, insensible a mayúsculas), `muscle_group`, `type`, `take`, `cursor`. |
| `GET` | `/:id` | Detalle. |
| `PUT` | `/:id` | Solo ejercicios propios. |
| `DELETE` | `/:id` | Soft-delete (solo propios). |
| `PUT` | `/:id/restore` | Restaura (solo propios). |
| `DELETE` | `/:id/hard` | Solo propios; `409` si alguna rutina lo usa. |

- El **catálogo base** viene sembrado con **57 ejercicios** (`user_id = null`) y **no se puede modificar** (`403`).
- Códigos:
  - `muscle_group`: `chest`, `back`, `legs`, `glutes`, `shoulders`, `biceps`, `triceps`, `core`, `cardio`, `mobility`.
  - `equipment`: `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`, `kettlebell`, `band`, `cardio_machine`, `other`.
  - `type`: `strength`, `cardio`, `mobility` (por defecto `strength`).
- El catálogo base tiene **57 ejercicios**; para el selector de la app usa `?take=100` (o pagina con `cursor`).

---

## 2. Rutinas (lunes a domingo)

Ruta base: `/gym/routines`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/` | `{ "name", "description"? }`. **La primera rutina se activa sola.** |
| `GET` | `/` | Listado (`?take&cursor`). La activa aparece primero. |
| `GET` | `/active` | Rutina activa o `null`. |
| `GET` | `/:id` | Detalle con sus días y ejercicios. |
| `GET` | `/:id/week` | Rejilla **lunes→domingo** (siempre 7 posiciones). |
| `PUT` | `/:id` | `{ "name"?, "description"? }`. |
| `PUT` | `/:id/days/:day_of_week` | Reemplaza el **día completo** (título, descanso, notas y ejercicios). |
| `DELETE` | `/:id/days/:day_of_week` | Quita el día de la rutina. |
| `PUT` | `/:id/activate` | Activa esta rutina y **desactiva las demás** del usuario. |
| `PUT` | `/:id/deactivate` | Deja de estar activa. |
| `DELETE` | `/:id` | Soft-delete; `409` si está activa (desactívala primero). |
| `PUT` | `/:id/restore` | Restaura. |
| `DELETE` | `/:id/hard` | `409` si está activa o si tiene sesiones registradas. |

### `PUT /gym/routines/:id/days/:day_of_week`

```json
{
  "title": "Pecho y tríceps",
  "is_rest": false,
  "notes": "Calentar 10 min",
  "exercises": [
    {
      "exercise_id": "gym-ex-press-banca",
      "sets": 4,
      "reps_min": 8,
      "reps_max": 12,
      "target_weight": 60,
      "rest_seconds": 90,
      "superset_group": "A",
      "notes": null
    }
  ]
}
```

- La **posición** de cada ejercicio se asigna según el orden del array.
- Día de descanso: `{ "is_rest": true, "exercises": [] }`. Enviar ejercicios en un día de descanso responde `400`.
- Cada `exercise_id` debe existir en el catálogo base o ser propio (`404` si no).
- `reps_min` no puede ser mayor que `reps_max` (`400`).
- Reemplazar o eliminar un día **desvincula** las sesiones ya registradas de ese día (`routine_day_id` queda en `null`); el historial de cada sesión se conserva intacto en su propio snapshot.

### `GET /gym/routines/:id/week`

```json
{
  "routine": { "id": "…", "name": "Full body", "is_active": true, "…": "…" },
  "days": [
    { "id": "…", "day_of_week": 1, "title": "Pecho", "is_rest": false, "notes": null, "exercises": [ … ] },
    { "id": null, "day_of_week": 2, "title": null, "is_rest": false, "notes": null, "exercises": [] },
    { "id": "…", "day_of_week": 3, "title": "Descanso", "is_rest": true, "notes": null, "exercises": [] },
    "…siempre 7 posiciones…"
  ]
}
```

`id: null` significa que ese día **aún no está configurado**.

---

## 3. Sesiones (registro de entrenamientos)

Ruta base: `/gym/sessions`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/` | Registra un entrenamiento (con ejercicios y series). |
| `GET` | `/` | Listado. Filtros: `preset`\|`from`+`to`, `routine_id`, `routine_day_id`, `status`, `take`, `cursor`. |
| `GET` | `/:id` | Detalle. |
| `PUT` | `/:id` | Actualiza metadatos; con `exercises` **reemplaza** todo el registro. |
| `DELETE` | `/:id` | Soft-delete. |
| `PUT` | `/:id/restore` | Restaura. |
| `DELETE` | `/:id/hard` | Borrado definitivo. |

### `POST /gym/sessions` (registro completo)

```json
{
  "date": "2026-10-15",
  "routine_id": "…",
  "routine_day_id": "…",
  "status": "completed",
  "started_at": "2026-10-15T18:00:00.000Z",
  "finished_at": "2026-10-15T19:05:00.000Z",
  "duration_minutes": 65,
  "rpe": 8,
  "notes": "Buena sesión",
  "exercises": [
    {
      "exercise_id": "gym-ex-press-banca",
      "sets": [
        { "reps": 12, "weight": 40, "is_warmup": true },
        { "reps": 8, "weight": 70, "rpe": 8 }
      ]
    },
    {
      "exercise_name": "Plancha",
      "muscle_group": "core",
      "sets": [{ "duration_seconds": 60 }]
    }
  ]
}
```

Comportamiento:

- **Prefill**: si envías solo `routine_day_id` (sin `exercises`), la sesión se crea en `in_progress` con los ejercicios y series **objetivo** de ese día (`completed: false`, reps = `reps_max`, peso = `target_weight`). Luego la completas con `PUT /:id`.
- **Ejercicio**: `exercise_id` (catálogo) **o** `exercise_name` (texto libre, `muscle_group` opcional). Uno de los dos es obligatorio (`400`).
- **Snapshot**: se guarda `exercise_name` y `muscle_group` del momento → cambios posteriores en el catálogo **no** alteran el historial.
- **Series**: `reps` + `weight` para fuerza; `duration_seconds` + `distance_meters` para cardio; `rpe` 1-10; `is_warmup` (se excluye de las métricas); `completed`. Cada serie requiere `reps` (fuerza) o `duration_seconds` (cardio): `400` si no trae ninguno.
- **`status`**: `in_progress`, `completed` (por defecto) o `skipped`.
- `date` por defecto = hoy (UTC). `routine_id`/`routine_day_id` son opcionales y deben pertenecer al usuario.
- `PUT /:id`: `routine_id`/`routine_day_id: null` desasignan; `exercises` presente reemplaza todos los ejercicios y series.

---

## 4. Métricas de rendimiento

### `GET /gym/summary?preset|from|to`

```json
{
  "sessions_count": 12,
  "training_days": 10,
  "total_sets": 320,
  "total_reps": 2600,
  "total_volume": 45230.5,
  "total_duration_minutes": 660,
  "average_rpe": 7.5,
  "planned_sessions": 17,
  "adherence": 0.71,
  "range": { "from": "2026-09-16T00:00:00.000Z", "to": "2026-10-15T00:00:00.000Z" }
}
```

- Solo cuenta sesiones `completed` sin soft-delete y **excluye series de calentamiento** (`is_warmup`).
- `total_volume = Σ (reps × peso)`.
- `planned_sessions`: días **no-descanso** de la rutina activa × semanas del rango (estimado). `null` si no hay rutina activa.
- `adherence = sessions_count / planned_sessions`. `null` si no había nada planificado.
- **Sin filtros de fecha** usa los **últimos 30 días**.

### `GET /gym/analytics/volume?period=day|week|month&preset|from|to`

```json
{
  "period": "week",
  "range": { "from": "…", "to": "…" },
  "data": [
    { "bucket": "2026-10-06T00:00:00.000Z", "sessions": 4, "sets": 96, "reps": 800, "volume": 12400 }
  ]
}
```

`period` por defecto `day`.

### `GET /gym/records?muscle_group&limit`

Récords personales **de por vida** por ejercicio:

```json
{
  "data": [
    {
      "exercise_id": "gym-ex-press-banca",
      "exercise_name": "Press de banca",
      "muscle_group": "chest",
      "max_weight": 80,
      "max_weight_reps": 5,
      "estimated_1rm": 93.33,
      "best_set_volume": 600,
      "achieved_at": "2026-10-10"
    }
  ]
}
```

- `estimated_1rm`: fórmula de **Epley** `peso × (1 + reps / 30)`.
- `best_set_volume`: mejor volumen de una sola serie (`reps × peso`).
- `limit` por defecto 50 (máx. 100); `muscle_group` filtra por grupo muscular.
- Solo se generan récords de ejercicios del **catálogo** (`exercise_id`); los ejercicios registrados como texto libre no se agrupan.

### `GET /gym/analytics/muscle-groups?preset|from|to`

Volumen por grupo muscular (para detectar desbalances, p. ej. pierna vs torso):

```json
{
  "range": { "from": "…", "to": "…" },
  "data": [
    { "muscle_group": "chest", "volume": 12400, "sets": 96, "reps": 800, "sessions": 4 },
    { "muscle_group": "back", "volume": 11800, "sets": 90, "reps": 760, "sessions": 4 }
  ]
}
```

Ordenado por volumen descendente. `muscle_group` puede ser `null` cuando el ejercicio se registró como texto libre sin grupo muscular.

### `GET /gym/analytics/load?period=day|week|month&preset|from|to`

Carga interna de entrenamiento (`sRPE = RPE × duración`) y ratio agudo:crónico:

```json
{
  "range": { "from": "…", "to": "…" },
  "acute_7d": 2100,
  "chronic_28d_weekly_avg": 1800,
  "acwr": 1.17,
  "total_srpe": 8400,
  "data": [
    { "bucket": "2026-10-06", "sessions": 4, "duration_minutes": 240, "srpe": 1920 }
  ],
  "daily": [
    { "date": "2026-10-06", "sessions": 1, "duration_minutes": 60, "srpe": 480 }
  ]
}
```

- `acute_7d`: sRPE de los últimos 7 días del rango. `chronic_28d_weekly_avg`: sRPE de los últimos 28 días ÷ 4.
- `acwr = acute_7d / chronic_28d_weekly_avg` (`null` si no hay carga crónica). Referencia práctica: **~0.8–1.3** es una zona habitualmente segura; **>1.5** suele indicar un aumento brusco de carga.
- `period` por defecto `week`; los buckets semanales empiezan en **lunes**.

### `GET /gym/analytics/exercises/:exercise_id/progress?preset|from|to`

Progresión sesión a sesión de un ejercicio:

```json
{
  "exercise_id": "gym-ex-press-banca",
  "exercise_name": "Press de banca",
  "muscle_group": "chest",
  "range": { "from": "…", "to": "…" },
  "data": [
    { "date": "2026-09-01", "max_weight": 70, "estimated_1rm": 80, "volume": 1000, "sets": 8, "reps": 80 },
    { "date": "2026-10-01", "max_weight": 80, "estimated_1rm": 93.33, "volume": 1200, "sets": 8, "reps": 80 }
  ],
  "progression": { "volume_change_pct": 20, "estimated_1rm_change_pct": 16.66 }
}
```

`progression` compara el primer y el último punto del rango (`null` si hay menos de dos sesiones). Solo aplica a ejercicios del catálogo (`exercise_id`).

### `GET /gym/calendar?year&month&routine_id`

Vista mensual: días **planificados** (rutina) vs **cumplidos** (sesiones):

```json
{
  "year": 2026,
  "month": 10,
  "routine_id": "…",
  "routine_name": "Full body",
  "summary": { "planned_days": 13, "completed_days": 10, "adherence": 0.77, "total_volume": 45230.5 },
  "data": [
    { "date": "2026-10-01", "day_of_week": 4, "planned": false, "planned_title": null,
      "planned_routine_day_id": null, "completed": false, "session_id": null, "volume": 0 },
    { "date": "2026-10-05", "day_of_week": 1, "planned": true, "planned_title": "Pecho",
      "planned_routine_day_id": "…", "completed": true, "session_id": "…", "volume": 2400 }
  ]
}
```

- `planned`: ese día de la semana tiene un día **no-descanso** en la rutina (por defecto la activa; `routine_id` la sobreescribe).
- `completed`: hubo al menos una sesión `completed`; `volume` suma todas las sesiones de ese día.
- `year`/`month` por defecto el mes actual (UTC).

### Filtros de fecha (comunes)

| Param | Descripción |
|---|---|
| `preset` | `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `last_7_days`, `last_30_days`, `this_year`. |
| `from`, `to` | Rango ISO. Un `to` solo-fecha (`YYYY-MM-DD`) **incluye todo el día**. |

---

## 5. Medidas corporales

Ruta base: `/gym/body-metrics`. **Una entrada por día** (clave `user_id + date`).

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/` | Crea la entrada del día o **la reemplaza** si ya existe. |
| `GET` | `/` | Listado (`?preset\|from\|to&take&cursor`), más reciente primero. |
| `GET` | `/latest` | Última entrada o `null` (para el dashboard). |
| `GET` | `/trend` | `?metric=weight_kg\|body_fat_pct\|muscle_mass_kg&preset\|from\|to` → `{ metric, range, data: [{ date, value }] }`. |
| `GET` | `/:id` | Detalle. |
| `PUT` | `/:id` | Actualiza campos (`null` limpia el valor). |
| `DELETE` | `/:id` | Soft-delete. |
| `PUT` | `/:id/restore` | Restaura. |
| `DELETE` | `/:id/hard` | Borrado definitivo. |

```json
POST /gym/body-metrics
{
  "date": "2026-10-15",
  "weight_kg": 78.5,
  "body_fat_pct": 17.2,
  "muscle_mass_kg": 62.1,
  "height_cm": 175,
  "measurements": { "chest": 102, "waist": 82, "arm": 36.5 },
  "notes": "En ayunas"
}
```

Respuesta (incluye `bmi` calculado cuando hay peso y estatura):

```json
{
  "id": "…", "date": "2026-10-15T00:00:00.000Z",
  "weight_kg": 78.5, "body_fat_pct": 17.2, "muscle_mass_kg": 62.1, "height_cm": 175,
  "measurements": { "chest": 102, "waist": 82, "arm": 36.5 },
  "bmi": 25.63, "notes": "En ayunas"
}
```

- `measurements` (en cm) solo admite estas claves: `neck`, `shoulders`, `chest`, `waist`, `hip`, `arm`, `thigh`, `calf`. Claves desconocidas o valores no numéricos/≤0 → `400`.
- Al menos una medida (`weight_kg`, `body_fat_pct`, `muscle_mass_kg` o `measurements`) es obligatoria (`400`).
- `POST` sobre una fecha ya existente **actualiza y restaura** esa entrada: nunca se duplican días.
- `height_cm` es opcional y solo se usa para el `bmi`.

---

## Errores

Formato global: `{ "statusCode": 403, "message": "..." }`

| Código | Cuándo |
|---|---|
| `400` | `day_of_week` fuera de 1-7; día de descanso con ejercicios; ejercicio sin `exercise_id` ni `exercise_name`; entrada corporal sin ninguna medida o con `measurements` inválidas; valores inválidos. |
| `403` | El módulo `gym` **no está activado**; intentar modificar el catálogo base; un recurso que no te pertenece. |
| `404` | Rutina, día, ejercicio, sesión o módulo inexistente. |
| `409` | Hard-delete de un ejercicio usado por una rutina; borrar/desactivar una rutina activa; hard-delete de una rutina con sesiones; desactivar una rutina ya inactiva; restaurar algo que no está borrado. |

---

## Esquema Prisma (referencia)

| Tabla | Contenido |
|---|---|
| `user_modules` | `user_id`, `module_key`, `enabled`, `enabled_at` — único por `(user_id, module_key)`. |
| `gym_exercises` | `user_id` (`null` = catálogo base), `name`, `muscle_group`, `equipment`, `type`. |
| `gym_routines` | `user_id`, `name`, `description`, `is_active`. |
| `gym_routine_days` | `routine_id`, `day_of_week` (1-7), `title`, `is_rest`, `notes` — único por `(routine_id, day_of_week)`. |
| `gym_routine_exercises` | `routine_day_id`, `exercise_id`, `position`, `sets`, `reps_min`, `reps_max`, `target_weight`, `rest_seconds`, `superset_group`, `notes`. |
| `gym_sessions` | `user_id`, `routine_id?`, `routine_day_id?`, `date`, `status`, `started_at`, `finished_at`, `duration_minutes`, `rpe`, `notes`. |
| `gym_session_exercises` | `session_id`, `exercise_id?`, `exercise_name`, `muscle_group`, `position`, `notes` (snapshot). |
| `gym_sets` | `session_exercise_id`, `set_number`, `reps?`, `weight?`, `rpe?`, `is_warmup`, `completed`, `duration_seconds?`, `distance_meters?`. |
| `gym_body_metrics` | `user_id`, `date`, `weight_kg?`, `body_fat_pct?`, `muscle_mass_kg?`, `height_cm?`, `measurements?` (JSON en cm), `notes?` — único por `(user_id, date)`. |

> Importante: la rutina se guarda como **plantilla**; la sesión guarda su **propio snapshot** (nombre y grupo muscular). Editar o borrar un ejercicio o una rutina **nunca** altera el historial ya registrado.
