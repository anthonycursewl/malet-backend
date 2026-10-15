-- CreateTable
CREATE TABLE "user_modules" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "module_key" VARCHAR(50) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_exercises" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "muscle_group" VARCHAR(50) NOT NULL,
    "equipment" VARCHAR(50),
    "type" VARCHAR(20) NOT NULL DEFAULT 'strength',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gym_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_routines" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gym_routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_routine_days" (
    "id" VARCHAR(255) NOT NULL,
    "routine_id" VARCHAR(255) NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "is_rest" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_routine_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_routine_exercises" (
    "id" VARCHAR(255) NOT NULL,
    "routine_day_id" VARCHAR(255) NOT NULL,
    "exercise_id" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps_min" INTEGER,
    "reps_max" INTEGER,
    "target_weight" DECIMAL(7,2),
    "rest_seconds" INTEGER,
    "superset_group" VARCHAR(10),
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_routine_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_sessions" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "routine_id" VARCHAR(255),
    "routine_day_id" VARCHAR(255),
    "date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "duration_minutes" INTEGER,
    "rpe" INTEGER,
    "notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gym_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_session_exercises" (
    "id" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "exercise_id" VARCHAR(255),
    "exercise_name" VARCHAR(255) NOT NULL,
    "muscle_group" VARCHAR(50),
    "position" INTEGER NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_session_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_sets" (
    "id" VARCHAR(255) NOT NULL,
    "session_exercise_id" VARCHAR(255) NOT NULL,
    "set_number" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" DECIMAL(7,2),
    "rpe" INTEGER,
    "is_warmup" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "duration_seconds" INTEGER,
    "distance_meters" DECIMAL(9,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_modules_user_id_idx" ON "user_modules"("user_id");

-- CreateIndex
CREATE INDEX "user_modules_module_key_idx" ON "user_modules"("module_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_modules_user_id_module_key_key" ON "user_modules"("user_id", "module_key");

-- CreateIndex
CREATE INDEX "gym_exercises_user_id_idx" ON "gym_exercises"("user_id");

-- CreateIndex
CREATE INDEX "gym_exercises_muscle_group_idx" ON "gym_exercises"("muscle_group");

-- CreateIndex
CREATE INDEX "gym_exercises_type_idx" ON "gym_exercises"("type");

-- CreateIndex
CREATE INDEX "gym_exercises_deleted_at_idx" ON "gym_exercises"("deleted_at");

-- CreateIndex
CREATE INDEX "gym_routines_user_id_idx" ON "gym_routines"("user_id");

-- CreateIndex
CREATE INDEX "gym_routines_is_active_idx" ON "gym_routines"("is_active");

-- CreateIndex
CREATE INDEX "gym_routines_deleted_at_idx" ON "gym_routines"("deleted_at");

-- CreateIndex
CREATE INDEX "gym_routine_days_routine_id_idx" ON "gym_routine_days"("routine_id");

-- CreateIndex
CREATE UNIQUE INDEX "gym_routine_days_routine_id_day_of_week_key" ON "gym_routine_days"("routine_id", "day_of_week");

-- CreateIndex
CREATE INDEX "gym_routine_exercises_routine_day_id_idx" ON "gym_routine_exercises"("routine_day_id");

-- CreateIndex
CREATE INDEX "gym_routine_exercises_exercise_id_idx" ON "gym_routine_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "gym_sessions_user_id_date_idx" ON "gym_sessions"("user_id", "date");

-- CreateIndex
CREATE INDEX "gym_sessions_routine_id_idx" ON "gym_sessions"("routine_id");

-- CreateIndex
CREATE INDEX "gym_sessions_routine_day_id_idx" ON "gym_sessions"("routine_day_id");

-- CreateIndex
CREATE INDEX "gym_sessions_status_idx" ON "gym_sessions"("status");

-- CreateIndex
CREATE INDEX "gym_sessions_deleted_at_idx" ON "gym_sessions"("deleted_at");

-- CreateIndex
CREATE INDEX "gym_session_exercises_session_id_idx" ON "gym_session_exercises"("session_id");

-- CreateIndex
CREATE INDEX "gym_session_exercises_exercise_id_idx" ON "gym_session_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "gym_sets_session_exercise_id_idx" ON "gym_sets"("session_exercise_id");

-- AddForeignKey
ALTER TABLE "user_modules" ADD CONSTRAINT "user_modules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_exercises" ADD CONSTRAINT "gym_exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_routines" ADD CONSTRAINT "gym_routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_routine_days" ADD CONSTRAINT "gym_routine_days_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "gym_routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_routine_exercises" ADD CONSTRAINT "gym_routine_exercises_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "gym_routine_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_routine_exercises" ADD CONSTRAINT "gym_routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "gym_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_sessions" ADD CONSTRAINT "gym_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_sessions" ADD CONSTRAINT "gym_sessions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "gym_routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_sessions" ADD CONSTRAINT "gym_sessions_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "gym_routine_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_session_exercises" ADD CONSTRAINT "gym_session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "gym_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_session_exercises" ADD CONSTRAINT "gym_session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "gym_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_sets" ADD CONSTRAINT "gym_sets_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "gym_session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: system exercise catalog (`user_id` NULL = shared by every user).
-- Idempotent on purpose: safe to re-run after a restore/redeploy.
INSERT INTO "gym_exercises" ("id", "user_id", "name", "muscle_group", "equipment", "type") VALUES
  ('gym-ex-press-banca', NULL, 'Press de banca', 'chest', 'barbell', 'strength'),
  ('gym-ex-press-inclinado-mancuernas', NULL, 'Press inclinado con mancuernas', 'chest', 'dumbbell', 'strength'),
  ('gym-ex-press-mancuernas-plano', NULL, 'Press plano con mancuernas', 'chest', 'dumbbell', 'strength'),
  ('gym-ex-aperturas-polea', NULL, 'Aperturas en polea', 'chest', 'cable', 'strength'),
  ('gym-ex-fondos-paralelas', NULL, 'Fondos en paralelas', 'chest', 'bodyweight', 'strength'),
  ('gym-ex-press-pecho-maquina', NULL, 'Press de pecho en máquina', 'chest', 'machine', 'strength'),
  ('gym-ex-dominadas', NULL, 'Dominadas', 'back', 'bodyweight', 'strength'),
  ('gym-ex-remo-barra', NULL, 'Remo con barra', 'back', 'barbell', 'strength'),
  ('gym-ex-jalon-al-pecho', NULL, 'Jalón al pecho', 'back', 'cable', 'strength'),
  ('gym-ex-remo-mancuerna', NULL, 'Remo con mancuerna', 'back', 'dumbbell', 'strength'),
  ('gym-ex-remo-maquina', NULL, 'Remo en máquina', 'back', 'machine', 'strength'),
  ('gym-ex-pullover-polea', NULL, 'Pullover en polea', 'back', 'cable', 'strength'),
  ('gym-ex-remo-invertido', NULL, 'Remo invertido', 'back', 'bodyweight', 'strength'),
  ('gym-ex-sentadilla-barra', NULL, 'Sentadilla con barra', 'legs', 'barbell', 'strength'),
  ('gym-ex-prensa-piernas', NULL, 'Prensa de piernas', 'legs', 'machine', 'strength'),
  ('gym-ex-zancadas', NULL, 'Zancadas', 'legs', 'dumbbell', 'strength'),
  ('gym-ex-peso-muerto-rumano', NULL, 'Peso muerto rumano', 'legs', 'barbell', 'strength'),
  ('gym-ex-extension-cuadriceps', NULL, 'Extensión de cuádriceps', 'legs', 'machine', 'strength'),
  ('gym-ex-curl-femoral', NULL, 'Curl femoral', 'legs', 'machine', 'strength'),
  ('gym-ex-elevacion-gemelos', NULL, 'Elevación de gemelos', 'legs', 'machine', 'strength'),
  ('gym-ex-sentadilla-goblet', NULL, 'Sentadilla goblet', 'legs', 'kettlebell', 'strength'),
  ('gym-ex-hip-thrust', NULL, 'Hip thrust', 'glutes', 'barbell', 'strength'),
  ('gym-ex-patada-gluteo', NULL, 'Patada de glúteo', 'glutes', 'cable', 'strength'),
  ('gym-ex-puente-gluteo', NULL, 'Puente de glúteo', 'glutes', 'bodyweight', 'strength'),
  ('gym-ex-abduccion-cadera', NULL, 'Abducción de cadera', 'glutes', 'machine', 'strength'),
  ('gym-ex-press-militar', NULL, 'Press militar', 'shoulders', 'barbell', 'strength'),
  ('gym-ex-elevaciones-laterales', NULL, 'Elevaciones laterales', 'shoulders', 'dumbbell', 'strength'),
  ('gym-ex-elevaciones-frontales', NULL, 'Elevaciones frontales', 'shoulders', 'dumbbell', 'strength'),
  ('gym-ex-pajaros', NULL, 'Pájaros (deltoide posterior)', 'shoulders', 'dumbbell', 'strength'),
  ('gym-ex-face-pull', NULL, 'Face pull', 'shoulders', 'cable', 'strength'),
  ('gym-ex-press-hombro-maquina', NULL, 'Press de hombros en máquina', 'shoulders', 'machine', 'strength'),
  ('gym-ex-curl-barra', NULL, 'Curl con barra', 'biceps', 'barbell', 'strength'),
  ('gym-ex-curl-mancuernas', NULL, 'Curl con mancuernas', 'biceps', 'dumbbell', 'strength'),
  ('gym-ex-curl-martillo', NULL, 'Curl martillo', 'biceps', 'dumbbell', 'strength'),
  ('gym-ex-curl-predicador', NULL, 'Curl predicador', 'biceps', 'machine', 'strength'),
  ('gym-ex-curl-inclinado', NULL, 'Curl en banco inclinado', 'biceps', 'dumbbell', 'strength'),
  ('gym-ex-press-frances', NULL, 'Press francés', 'triceps', 'barbell', 'strength'),
  ('gym-ex-extension-polea', NULL, 'Extensión de tríceps en polea', 'triceps', 'cable', 'strength'),
  ('gym-ex-fondos-banco', NULL, 'Fondos en banco', 'triceps', 'bodyweight', 'strength'),
  ('gym-ex-patada-triceps', NULL, 'Patada de tríceps', 'triceps', 'dumbbell', 'strength'),
  ('gym-ex-press-cerrado', NULL, 'Press cerrado', 'triceps', 'barbell', 'strength'),
  ('gym-ex-plancha', NULL, 'Plancha', 'core', 'bodyweight', 'strength'),
  ('gym-ex-crunch', NULL, 'Crunch', 'core', 'bodyweight', 'strength'),
  ('gym-ex-elevacion-piernas', NULL, 'Elevación de piernas', 'core', 'bodyweight', 'strength'),
  ('gym-ex-russian-twist', NULL, 'Russian twist', 'core', 'dumbbell', 'strength'),
  ('gym-ex-rueda-abdominal', NULL, 'Rueda abdominal', 'core', 'other', 'strength'),
  ('gym-ex-plancha-lateral', NULL, 'Plancha lateral', 'core', 'bodyweight', 'strength'),
  ('gym-ex-caminadora', NULL, 'Caminadora', 'cardio', 'cardio_machine', 'cardio'),
  ('gym-ex-bicicleta-estatica', NULL, 'Bicicleta estática', 'cardio', 'cardio_machine', 'cardio'),
  ('gym-ex-eliptica', NULL, 'Elíptica', 'cardio', 'cardio_machine', 'cardio'),
  ('gym-ex-remo-ergometro', NULL, 'Remo ergómetro', 'cardio', 'cardio_machine', 'cardio'),
  ('gym-ex-saltar-cuerda', NULL, 'Saltar la cuerda', 'cardio', 'other', 'cardio'),
  ('gym-ex-hiit', NULL, 'HIIT', 'cardio', 'bodyweight', 'cardio'),
  ('gym-ex-estiramiento-isquiotibiales', NULL, 'Estiramiento de isquiotibiales', 'mobility', 'bodyweight', 'mobility'),
  ('gym-ex-movilidad-cadera', NULL, 'Movilidad de cadera', 'mobility', 'bodyweight', 'mobility'),
  ('gym-ex-movilidad-hombros', NULL, 'Movilidad de hombros', 'mobility', 'band', 'mobility'),
  ('gym-ex-gato-camello', NULL, 'Gato-camello', 'mobility', 'bodyweight', 'mobility')
ON CONFLICT ("id") DO NOTHING;


