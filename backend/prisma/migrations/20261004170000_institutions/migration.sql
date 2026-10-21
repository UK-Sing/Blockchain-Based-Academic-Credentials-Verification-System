-- CreateEnum
CREATE TYPE "InstitutionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('UNVERIFIED', 'VERIFIED', 'ACCREDITED');

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "registrationNumber" TEXT,
    "address" TEXT,
    "status" "InstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "trustLevel" "TrustLevel" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "institutions_name_key" ON "institutions"("name");
CREATE UNIQUE INDEX "institutions_email_key" ON "institutions"("email");
CREATE INDEX "institutions_status_idx" ON "institutions"("status");

-- New ownership columns
ALTER TABLE "credentials" ADD COLUMN "institutionId" TEXT;
ALTER TABLE "students" ADD COLUMN "institutionId" TEXT;

-- Data migration: everything issued so far was issued by the single admin on behalf of
-- "Demo University". Create that institution (ACTIVE) and attribute existing records to it
-- before the admin-attribution columns are dropped, so issuer attribution is preserved.
-- Demo login: registrar@demo-university.edu / Institution@123
INSERT INTO "institutions" ("id", "name", "email", "passwordHash", "contactName", "website", "registrationNumber", "status", "reviewedAt", "trustLevel", "updatedAt")
SELECT 'inst-demo-university', 'Demo University', 'registrar@demo-university.edu',
       '$2b$10$uhjWeEVCoyt/6MwjEkALBOGE08PYlGBcVmaku2fj24XRvESqzNzwq',
       'Registrar Office', 'https://demo-university.edu', 'AISHE-U-0000', 'ACTIVE', CURRENT_TIMESTAMP, 'VERIFIED', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "credentials") OR EXISTS (SELECT 1 FROM "students");

UPDATE "credentials" SET "institutionId" = 'inst-demo-university'
WHERE EXISTS (SELECT 1 FROM "institutions" WHERE "id" = 'inst-demo-university');

UPDATE "students" SET "institutionId" = 'inst-demo-university'
WHERE EXISTS (SELECT 1 FROM "institutions" WHERE "id" = 'inst-demo-university');

-- Admins no longer issue or revoke; drop the old attribution links.
ALTER TABLE "credentials" DROP CONSTRAINT "credentials_issuedById_fkey";
ALTER TABLE "revocations" DROP CONSTRAINT "revocations_revokedById_fkey";
ALTER TABLE "credentials" DROP COLUMN "issuedById";
ALTER TABLE "revocations" DROP COLUMN "revokedById";

CREATE INDEX "credentials_institutionId_idx" ON "credentials"("institutionId");
CREATE INDEX "students_institutionId_idx" ON "students"("institutionId");

ALTER TABLE "students" ADD CONSTRAINT "students_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
