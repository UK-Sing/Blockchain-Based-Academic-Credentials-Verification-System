import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const DEMO_REVOCATION_REASON = "Academic integrity violation identified after issuance (demo reason).";

/**
 * Attempts to load the deployed contract's address + ABI (written by
 * scripts/deploy.ts at the repo root — `pnpm run deploy:local`) and issue each demo credential on-chain
 * too, so the seeded data is immediately verifiable end-to-end.
 *
 * If no local Hardhat node / deployment is available, this fails silently
 * and the credentials remain DB-only until re-synced (see README ->
 * "Anchoring demo data on-chain").
 */
async function tryGetChainIssuer(): Promise<
  | {
      issue: (id: string, hash: string) => Promise<{ txHash: string; blockNumber: number }>;
      revoke: (id: string, reason: string) => Promise<{ txHash: string; blockNumber: number }>;
      isIssued: (id: string) => Promise<{ exists: boolean; isRevoked: boolean }>;
      network: string;
      contractAddress: string;
    }
  | null
> {
  try {
    const generatedPath = path.join(__dirname, "../src/blockchain/generated/CredentialRegistry.json");
    if (!fs.existsSync(generatedPath)) return null;

    const deployment = JSON.parse(fs.readFileSync(generatedPath, "utf-8"));
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    if (!privateKey) return null;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.NonceManager(new ethers.Wallet(privateKey, provider));
    const contract = new ethers.Contract(deployment.address, deployment.abi, wallet);

    // quick connectivity check
    await provider.getBlockNumber();

    return {
      network: deployment.network,
      contractAddress: deployment.address,
      issue: async (id: string, hash: string) => {
        const tx = await contract.issueCredential(id, hash);
        const receipt = await tx.wait();
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
      },
      revoke: async (id: string, reason: string) => {
        const tx = await contract.revokeCredential(id, reason);
        const receipt = await tx.wait();
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
      },
      isIssued: async (id: string) => {
        const result = await contract.verifyCredential(id);
        return { exists: result[0] ?? result.exists, isRevoked: result[4] ?? result.isRevoked };
      },
    };
  } catch {
    return null;
  }
}

/**
 * NOTE: This seed script inserts DEMO/FICTIONAL data only, for local
 * development and college viva demonstration. It does not represent any
 * real student.
 *
 */

function canonicalize(data: Record<string, unknown>): string {
  return Object.keys(data)
    .sort()
    .map((key) => `${key}:${data[key]}`)
    .join("|");
}

function hashCredential(data: Record<string, unknown>): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalize(data)));
}

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 10);

  // Platform maintainer. Earlier seeds created it as admin@demo-university.edu, which wrongly
  // tied it to a university; move that account to a platform address.
  await prisma.admin.updateMany({
    where: { email: "admin@demo-university.edu" },
    data: { email: "admin@credential-chain.dev", name: "Platform Maintainer" },
  });
  await prisma.admin.upsert({
    where: { email: "admin@credential-chain.dev" },
    update: {},
    create: { name: "Platform Maintainer", email: "admin@credential-chain.dev", passwordHash, role: "ADMIN" },
  });

  const institutionPasswordHash = await bcrypt.hash("Institution@123", 10);
  const institution = await prisma.institution.upsert({
    where: { email: "registrar@demo-university.edu" },
    update: {},
    create: {
      name: "Demo University",
      email: "registrar@demo-university.edu",
      passwordHash: institutionPasswordHash,
      contactName: "Registrar Office",
      website: "https://demo-university.edu",
      registrationNumber: "AISHE-U-0000",
      status: "ACTIVE",
      reviewedAt: new Date(),
      trustLevel: "VERIFIED",
    },
  });
  // A pending application, so the maintainer console has something to review.
  await prisma.institution.upsert({
    where: { email: "admissions@northbridge-tech.edu" },
    update: {},
    create: {
      name: "Northbridge Institute of Technology",
      email: "admissions@northbridge-tech.edu",
      passwordHash: institutionPasswordHash,
      contactName: "Office of the Controller of Examinations",
      website: "https://northbridge-tech.edu",
      registrationNumber: "AISHE-C-4521",
    },
  });

  const studentPasswordHash = await bcrypt.hash("Student@123", 10);
  const demoStudents = [
    { studentId: "STU2026001", name: "Rahul Sharma", email: "rahul.sharma@demo-university.edu", batchYear: 2026 },
    { studentId: "STU2026002", name: "Priya Verma", email: "priya.verma@demo-university.edu", batchYear: 2026 },
    { studentId: "STU2026003", name: "Ankit Mehta", email: "ankit.mehta@demo-university.edu", batchYear: 2025 },
  ];
  for (const s of demoStudents) {
    await prisma.student.upsert({
      where: { studentId: s.studentId },
      update: { institutionId: institution.id },
      create: { ...s, department: "Computer Science", passwordHash: studentPasswordHash, institutionId: institution.id },
    });
  }

  const demoCredentials = [
    {
      credentialId: "CRED-2026-000001",
      studentName: "Rahul Sharma",
      studentId: "STU2026001",
      universityName: "Demo University",
      degree: "Bachelor of Computer Applications",
      course: "Computer Applications",
      department: "Computer Science",
      graduationYear: 2026,
      issueDate: new Date("2026-06-15"),
      grade: "8.7 CGPA",
      status: "VALID" as const,
    },
    {
      credentialId: "CRED-2026-000002",
      studentName: "Priya Verma",
      studentId: "STU2026002",
      universityName: "Demo University",
      degree: "Bachelor of Computer Applications",
      course: "Computer Applications",
      department: "Computer Science",
      graduationYear: 2026,
      issueDate: new Date("2026-06-15"),
      grade: "9.1 CGPA",
      status: "VALID" as const,
    },
    {
      credentialId: "CRED-2026-000003",
      studentName: "Ankit Mehta",
      studentId: "STU2026003",
      universityName: "Demo University",
      degree: "Bachelor of Computer Applications",
      course: "Computer Applications",
      department: "Computer Science",
      graduationYear: 2025,
      issueDate: new Date("2025-06-20"),
      grade: "7.4 CGPA",
      status: "REVOKED" as const,
    },
  ];

  const chainIssuer = await tryGetChainIssuer();
  if (chainIssuer) {
    console.log(`Connected to chain (${chainIssuer.network}) - demo credentials will be anchored on-chain.`);
  } else {
    console.log("No local blockchain connection found - seeding DB only.");
    console.log("Start Hardhat + deploy the contract, then re-run `npm run prisma:seed` to anchor demo data on-chain.");
  }

  for (const c of demoCredentials) {
    const credentialHash = hashCredential({
      credentialId: c.credentialId,
      studentName: c.studentName,
      studentId: c.studentId,
      universityName: c.universityName,
      degree: c.degree,
      course: c.course,
      department: c.department,
      graduationYear: c.graduationYear,
      issueDate: c.issueDate.toISOString(),
      grade: c.grade,
    });

    let blockchainTxHash: string | undefined;
    let blockNumber: number | undefined;
    let contractAddress: string | undefined;
    let network: string | undefined;
    let onChain: { exists: boolean; isRevoked: boolean } | undefined;

    if (chainIssuer) {
      try {
        onChain = await chainIssuer.isIssued(c.credentialId);
        if (onChain.exists) {
          console.log(`  = ${c.credentialId} already anchored on-chain, skipping issue.`);
          contractAddress = chainIssuer.contractAddress;
          network = chainIssuer.network;
        } else {
          const result = await chainIssuer.issue(c.credentialId, credentialHash);
          blockchainTxHash = result.txHash;
          blockNumber = result.blockNumber;
          contractAddress = chainIssuer.contractAddress;
          network = chainIssuer.network;
          onChain = { exists: true, isRevoked: false };
        }
      } catch (err: any) {
        console.warn(`  ! Could not anchor ${c.credentialId} on-chain: ${err.message?.slice(0, 120)}`);
      }
    }

    const created = await prisma.credential.upsert({
      where: { credentialId: c.credentialId },
      update: {
        blockchainTxHash,
        blockNumber,
        contractAddress,
        network,
        blockchainCredentialId: c.credentialId,
        institutionId: institution.id,
      },
      create: {
        ...c,
        credentialHash,
        institutionId: institution.id,
        blockchainTxHash,
        blockNumber,
        contractAddress,
        network,
        blockchainCredentialId: c.credentialId,
      },
    });

    if (c.status === "REVOKED") {
      let revokeTxHash: string | undefined;
      let revokeBlockNumber: number | undefined;

      if (chainIssuer && onChain?.exists) {
        if (onChain.isRevoked) {
          console.log(`  = ${c.credentialId} already revoked on-chain, skipping revoke.`);
        } else {
          try {
            const result = await chainIssuer.revoke(c.credentialId, DEMO_REVOCATION_REASON);
            revokeTxHash = result.txHash;
            revokeBlockNumber = result.blockNumber;
          } catch (err: any) {
            console.warn(`  ! Could not revoke ${c.credentialId} on-chain: ${err.message?.slice(0, 120)}`);
          }
        }
      }

      await prisma.revocation.upsert({
        where: { credentialId: c.credentialId },
        update: {
          blockchainTxHash: revokeTxHash,
          blockNumber: revokeBlockNumber,
        },
        create: {
          credentialId: created.credentialId,
          reason: DEMO_REVOCATION_REASON,
          blockchainTxHash: revokeTxHash,
          blockNumber: revokeBlockNumber,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Platform maintainer login -> admin@credential-chain.dev / Admin@123");
  console.log("Institution login (ACTIVE)  -> registrar@demo-university.edu / Institution@123");
  console.log("Institution login (PENDING) -> admissions@northbridge-tech.edu / Institution@123");
  console.log("Demo student logins -> STU2026001, STU2026002, STU2026003 / password: Student@123");
  console.log("Demo credential IDs: CRED-2026-000001 (VALID), CRED-2026-000002 (VALID), CRED-2026-000003 (REVOKED)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
