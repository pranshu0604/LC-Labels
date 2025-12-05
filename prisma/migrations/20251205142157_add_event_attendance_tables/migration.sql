-- CreateTable
CREATE TABLE "event_attendance_sessions" (
    "id" SERIAL NOT NULL,
    "coordinator_id" INTEGER NOT NULL,
    "session_datetime" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),

    CONSTRAINT "event_attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendance_records" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "volunteer_id" INTEGER NOT NULL,
    "is_present" BOOLEAN NOT NULL DEFAULT false,
    "marked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),

    CONSTRAINT "event_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_event_attendance_coordinator_id" ON "event_attendance_sessions"("coordinator_id");

-- CreateIndex
CREATE INDEX "idx_event_attendance_session_datetime" ON "event_attendance_sessions"("session_datetime");

-- CreateIndex
CREATE INDEX "idx_event_attendance_record_session_id" ON "event_attendance_records"("session_id");

-- CreateIndex
CREATE INDEX "idx_event_attendance_record_volunteer_id" ON "event_attendance_records"("volunteer_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendance_records_session_id_volunteer_id_key" ON "event_attendance_records"("session_id", "volunteer_id");

-- AddForeignKey
ALTER TABLE "event_attendance_sessions" ADD CONSTRAINT "event_attendance_sessions_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "coordinators"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_attendance_records" ADD CONSTRAINT "event_attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "event_attendance_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_attendance_records" ADD CONSTRAINT "event_attendance_records_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
