-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('VALID', 'REVOKED');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "universityName" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "grade" TEXT NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "blockchainTxHash" TEXT,
    "blockchainCredentialId" TEXT,
    "blockNumber" INTEGER,
    "contractAddress" TEXT,
    "network" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'VALID',
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revocations" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "revokedById" TEXT,
    "blockchainTxHash" TEXT,
    "blockNumber" INTEGER,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_credentialId_key" ON "credentials"("credentialId");

-- CreateIndex
CREATE INDEX "credentials_status_idx" ON "credentials"("status");

-- CreateIndex
CREATE INDEX "credentials_studentId_idx" ON "credentials"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "revocations_credentialId_key" ON "revocations"("credentialId");

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "credentials"("credentialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
