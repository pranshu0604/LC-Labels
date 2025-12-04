-- CreateTable
CREATE TABLE "people" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "registration_no" VARCHAR(100) NOT NULL,
    "uid" VARCHAR(50),
    "contact_no" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
    "updated_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_registration_no_key" ON "people"("registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "people_uid_key" ON "people"("uid");

-- CreateIndex
CREATE INDEX "idx_people_registration_no" ON "people"("registration_no");

-- CreateIndex
CREATE INDEX "idx_attendance_date" ON "attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_person_id_date_key" ON "attendance"("person_id", "date");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
