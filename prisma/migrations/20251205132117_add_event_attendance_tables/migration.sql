-- CreateTable
CREATE TABLE "coordinators" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "registration_no" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
    "updated_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),

    CONSTRAINT "coordinators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "registration_no" VARCHAR(100) NOT NULL,
    "contact_no" VARCHAR(50) NOT NULL,
    "coordinator_id" INTEGER NOT NULL,
    "attendance" TIMESTAMPTZ(6)[] DEFAULT ARRAY[]::TIMESTAMPTZ(6)[],
    "created_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
    "updated_at" TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coordinators_username_key" ON "coordinators"("username");

-- CreateIndex
CREATE UNIQUE INDEX "coordinators_registration_no_key" ON "coordinators"("registration_no");

-- CreateIndex
CREATE INDEX "idx_coordinator_username" ON "coordinators"("username");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_registration_no_key" ON "volunteers"("registration_no");

-- CreateIndex
CREATE INDEX "idx_volunteer_registration_no" ON "volunteers"("registration_no");

-- CreateIndex
CREATE INDEX "idx_volunteer_coordinator_id" ON "volunteers"("coordinator_id");

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_coordinator_id_fkey" FOREIGN KEY ("coordinator_id") REFERENCES "coordinators"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
